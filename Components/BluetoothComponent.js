import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
    NativeAppEventEmitter,
    NativeEventEmitter,
    NativeModules,
    Platform,
    PermissionsAndroid,
    ListView,
    ScrollView,
    AppState,
    Dimensions,
    AsyncStorage
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { SafeAreaView } from 'react-navigation';
// import PushNotification from 'react-native-push-notification';
import { Buffer } from 'buffer';
import { withGlobalState } from 'react-globally';
import BackgroundTimer from 'react-native-background-timer';

const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BLEManager extends Component 
{
    constructor ()
    {
        super();

        var newStore = new Array(64);
        for (var j = 0; j < 64; j++) newStore[j] = 0;
        
        this.state = {
            scanning:false,
            peripherals: new Map(),
            appState: '',
            reading: false,
            readingsCompleted: 0,
            curReadings: newStore,
            charsRead: 0,
            myPatch: null,
            connectedToPatch: false,
            autoRead: false
        }

        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
        this.resetReadings = this.resetReadings.bind(this);
        this.checkAlarm = this.checkAlarm.bind(this);
        this.retrieveItem = this.retrieveItem.bind(this);
        this.storeItem = this.storeItem.bind(this);
        this.isConnected = this.isConnected.bind(this);
    }

    resetReadings () {
        console.log('resetReadings() before, reading: ' + this.state.reading + ', charsRead: ' + this.state.charsRead);
        this.state.reading = false;
        this.state.charsRead = 0;
        var newStore = new Array(64);
        for (var j = 0; j < 64; j++) newStore[j] = 0;
        this.setState({curReadings: newStore});
        console.log('resetReadings() after, reading: ' + this.state.reading + ', charsRead: ' + this.state.charsRead);
    }

    processData (floats_64) {
        dataValue = 0;
        for (var i = 0; i < 64; i++) dataValue += floats_64[i];
        dataValue = dataValue / 64;

        console.log('processData(): ' + dataValue);
        return dataValue;
    }

    componentDidMount () 
    {
        AsyncStorage.removeItem('VolumeData');
        console.log('componentDidMount(): ');
        const intervalId = BackgroundTimer.setInterval(() => {
            console.log('BackgroundTimer.setInterval(); connectedToPatch: ' + this.state.connectedToPatch);
            if(this.state.connectedToPatch == false) {
                console.log('connectedToPatch: ', this.state.connectedToPatch);
                this.startScan();
            } else {
                console.log('connectedToPatch: ', this.state.connectedToPatch);
                this.handleUpdateValueForCharacteristic({peripheral: this.state.myPatch.id, value: [7]});
            }
        }, 30000);

        AppState.addEventListener('change', this.handleAppStateChange);

        BleManager.start({showAlert: false});

        // PushNotification.configure({
        //     onNotification: function(notification) {
        //         console.log('NOTIFICATION: ', notification);
        //     },
        //     popInitialNotification: true,
        // });

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );

        if (Platform.OS === 'android' && Platform.Version >= 23) 
        {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result)
                    console.log("Permission is OK");
                else 
                {
                    PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                        if (result)
                            console.log("User accept");
                        else
                            console.log("User refuse");
                    });
                }
            });
        }

    }

    isConnected(peripheral) {
        this.retrieveConnected();
        return this.state.peripherals.has(peripheral.id);
    }
    handleAppStateChange (nextAppState) 
    {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') 
        {
            console.log('App has come to the foreground!')
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
                console.log('Connected peripherals: ' + peripheralsArray.length);
            });
        } 
        this.setState({appState: nextAppState});
    }

    componentWillUnmount () 
    {
        console.log("componentWillUnmount()");
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();

        if (this.state.myPatch) {
            BleManager.disconnect(this.state.myPatch.id);
        }
    }

    handleDisconnectedPeripheral (data) 
    {
        let peripherals = this.state.peripherals;
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) 
        {
            peripheral.connected = false;
            peripherals.set(peripheral.id, peripheral);
            this.setState({peripherals});
        }
        console.log('Disconnected from ' + data.peripheral);
        this.resetReadings();
    }

    handleUpdateValueForCharacteristic (data) 
    {
        if (this.state.reading == true) {
            return;
        } else {
            this.state.reading = true;
        }

        //console.log('Received data from ' + data.peripheral);
        console.log('Value: ' + data.value);
        //console.log('peripheral: ' + data.peripheral);


        var service = '72369D5C-94E1-41D7-ACAB-A88062C506A8';
        console.log('Service: ' + service);
        var readChars = [
            '056B0F3D-57D7-4842-A4F1-3177FD883A97',
            '36142750-2A5A-450A-BA69-9C072DB93079',
            '156B0F3D-57D7-4842-A4F1-3177FD883A97',
            'ED887B10-87E3-43D8-8595-7F8C0394A9AE',
            '38330731-44AC-462C-93A3-054F93A9A35A',
            '09EC3E8F-4390-439D-BBDF-2B79370ABA51',
            '7AC8C0E7-EBC7-4A44-9EE1-EEEA9FA2218D',
            '0EBC4973-F784-4849-8891-7D759FB1E3B7',
            '638E8CBF-BC8B-4B24-A719-D9F0DFE24784',
            'DE76C062-35DD-44ED-B8C2-CB28B98CDEF4',
            '90F1A21F-5D34-4B94-9797-E3873C66FA78',
            'C3C8B0A0-A540-486D-A94E-405F2F3D1334',
            '59A8A2B1-7E54-419A-A37F-F59D01D80CAE',
            '3ACB209A-3B54-4B2D-8981-C5D8E2B85DB7',
            '3D2A633F-5EEA-4346-A073-CBDD002040D1',
            'C3151BB7-3E2C-4821-8EB9-4067A6585508'
        ];
        var readings = [];
        var index = 0;

        var cnt = 0;
        var readChar = () => {
            BleManager.read(data.peripheral, service, readChars[cnt])
                .then((readData) => {
                    console.log('----READ----');

                    var temp = new Buffer(17);
                    for (var j = 0; j < 17; j++)
                        temp.writeUInt8(readData[j], j);
                    //var id = temp.readInt8(16);
                    readings[index * 4] = temp.readFloatBE(0);
                    readings[index * 4 + 1] = temp.readFloatBE(4);
                    readings[index * 4 + 2] = temp.readFloatBE(8);
                    readings[index * 4 + 3] = temp.readFloatBE(12);
                    index++;

                    cnt = (cnt + 1) % 16;
                    this.state.charsRead = (this.state.charsRead + 1) % 32;

                    console.log('cnt: ' + cnt + ', charsRead: ' + this.state.charsRead);
                    if (/*cnt != readChars.length && */this.state.charsRead != (readChars.length * 2 - 1))
                    {
                        console.log('continue');
                        readCharBound();
                    }
                    else
                    {
                        console.log('STATE:');
                        //console.log(this.state);
                        var curr = this.state.curReadings;
                        for (var j = 0; j < 64; j++)
                        {
                            curr[j] += readings[j];
                            this.setState({curReadings: curr});
                        }

                        // if (data.value == 4)
                        if (this.state.charsRead == 31)
                        {
                            this.state.reading = false;
                            console.log('Values read');

                            var avg = this.state.curReadings;
                            for (var j = 0; j < 64; j++)
                                avg[j] /= 10;
                            var pendingReadings = this.props.globalState.pendingReadings;

                            var da = new Date();
                            var y = da.getUTCFullYear();
                            var m = (da.getUTCMonth() + 1);
                            m = (m < 10 ? '0' : '') + m;
                            var d = da.getUTCDate();
                            d = (d < 10 ? '0' : '') + d;
                            var h = da.getUTCHours();
                            h = (h < 10 ? '0' : '') + h;
                            var mi = da.getUTCMinutes();
                            mi = (mi < 10 ? '0' : '') + mi;
                            var s = da.getUTCSeconds();
                            s = (s < 10 ? '0' : '') + s;
                            var utc = y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;
                            console.log(utc);

                            var newReading = {
                                timestamp: utc,
                                channels: avg
                            };
                            pendingReadings.push(newReading);
                            this.props.setGlobalState({pendingReadings});
                            var postObj = {
                                authCode: this.props.globalState.authCode,
                                id: this.props.globalState.id,
                                readings: pendingReadings
                            };
                            

                            console.log('SEND HERE');
                            console.log(postObj);

                            //if able to post
                            if(this.props.globalState.email != '') {
                                fetch('https://majestic-legend-193620.appspot.com/insert/reading', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(postObj)
                                })
                                .then((result) => result.json())
                                .then((json) => {
                                    console.log('Send done');
                                    console.log(json);
                                    pendingReadings = [];
                                    this.props.setGlobalState({pendingReadings});
                                });
                            }
                            // Local storage
                            // else {
                            //     var newReadingList = [];
                            //     this.retrievedItem("offlineReadings").then((offlineReadings) => {
                            //         // Need to parse offlineReadings
                            //         // newReadingList = offlineReadings;
                            //         var offlineEntry;
                            //         newReadingList.push({offlineEntry});
                            //     });
                            // }
                            var newCurrentVolume = this.processData(avg);
                            this.props.setGlobalState({currentVolume: newCurrentVolume});


                            var currentData = '';
                            console.log('about to retreiveItem()');
                            this.retrieveItem('VolumeData').then((dataRecord) => {
                                console.log('dataRecord: '+ dataRecord + ', newCurrentVol: ' + newCurrentVolume);

                                if(dataRecord == undefined) {
                                    currentData = '' + newCurrentVolume;
                                } else {
                                    var myArray = dataRecord.split(",");
                                    console.log('dataRecord Array: ' + myArray);
                                    console.log('dataRecord length: ' + myArray.length);
                                    if (myArray.length == 3) {
                                        console.log('dataRecord length equals target');
                                        myArray.shift();
                                        myArray.push(newCurrentVolume);
                                        currentData = myArray.join();
                                    } else {
                                        currentData = dataRecord + ', ' + newCurrentVolume;
                                    }
                                }

                                console.log('Current local data: ' + currentData);
                                this.storeItem('VolumeData', currentData).then(() => {
                                    console.log('Data stored in Ble successful: ' + currentData);
                                }).catch((error) => {
                                    console.log('Data failed to be stored in Ble');
                                })

                            }).catch((error) => {
                                console.log('Bluetooth retreive data promise is rejected with error: ' + error);
                                currentData += newCurrentVolume;
                            });

                            // console.log('Current local data: ' + currentData);
                            // this.storeItem('VolumeData', currentData).then(() => {
                            //     console.log('Data stored in Ble successful: ' + currentData);
                            // }).catch((error) => {
                            //     console.log('Data failed to be stored in Ble');
                            // })

                            this.checkAlarm(newCurrentVolume);

                            // var newStore = new Array(64);
                            // for (var j = 0; j < 64; j++) newStore[j] = 0;
                            //     this.setState({curReadings: newStore});
                            this.resetReadings();
                        }
                    }
                })
                .catch((error) => {
                    console.log('READ ERROR');
                    console.log(error);
                    this.resetReadings();
                    // cnt--;
                    // index--;
                    // this.state.charsRead = this.state.charsRead - 1;
                    
                });
        }
        var readCharBound = readChar.bind(this);
        readCharBound();
    }

    handleStopScan () 
    {
        console.log('Scan is stopped');
        this.setState({ scanning: false });
    }

    startScan () 
    {
        if (!this.state.scanning) 
        {
            this.setState({peripherals: new Map()});
            BleManager.scan([], 3, true).then((results) => {
                console.log('Scanning...');
                this.setState({scanning:true});
            });
        }
    }

    retrieveConnected ()
    {
        BleManager.getConnectedPeripherals([]).then((results) => {
            console.log(results);
            var peripherals = this.state.peripherals;
            for (var i = 0; i < results.length; i++) 
            {
                var peripheral = results[i];
                peripheral.connected = true;
                peripherals.set(peripheral.id, peripheral);
                this.setState({ peripherals });
            }
        });
    }

    handleDiscoverPeripheral (peripheral)
    {
        var peripherals = this.state.peripherals;
        if (!peripherals.has(peripheral.id))
        {
            console.log('Got ble peripheral', peripheral);
            peripherals.set(peripheral.id, peripheral);
            this.setState({ peripherals })
            if(peripheral.name == "PatchSim") {
                console.log('handleDiscoverPeripheral(); Calling test on peripheral');
                this.state.myPatch = peripheral;
                this.test(peripheral);
            }
        }
    }

    test (peripheral) 
    {
        if (peripheral)
        {
            if (peripheral.connected) {
                console.log('Trying to disconnect from peripheral');
                BleManager.disconnect(peripheral.id).then(() => {
                    this.state.connectedToPatch = false;
                    //this.state.myPatch = null;
                })
                this.resetReadings();
                // BleManager.disconnect(peripheral.id).then(() => {
                //     console.log('Disconnected successfully from: ' + peripheral.id  + ', ' + peripheral.name);
                //     this.state.reading = false;
                // }, (err) => {
                //     console.log('Disconnected failure from: ' + peripheral.id  + ', ' + peripheral.name + ', error: ' + err);
                // })
            } else
            {
                console.log('test(); trying to connect to peripheral');
                BleManager.stopScan().then(() => {
                    console.log('Stop scanning successful');
                }, (err) => {
                    console.log('Stop scanning failed: ' + err);
                });
                BleManager.connect(peripheral.id).then(() => {
                    let peripherals = this.state.peripherals;
                    let p = peripherals.get(peripheral.id);
                    if (p) 
                    {
                        p.connected = true;
                        peripherals.set(peripheral.id, p);
                        this.setState({peripherals});
                    }
                    console.log('Connected to ' + peripheral.id);

                    // BleManager.createBond(peripheral.id).then(() => {
                    //     console.log('Bonded to: ' + peripheral.name + ', ' + peripheral.id);
                    // }, (bond_error) => {
                    //     console.log('Failed to Bond: ' + bond_error);
                    // });
                    //setTimeout(() => {
                        if (peripheral.name == "PatchSim") {
                            this.state.connectedToPatch = true;
                        }

                        BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
                            console.log('Peripheral Info');
                            console.log(peripheralInfo);

                            var service =    '72369D5C-94E1-41D7-ACAB-A88062C506A8';
                            var notifyChar = '222B99A0-37CC-4799-9152-7C35D5C5FE07';

                            // BleManager.startNotification(peripheral.id, service, notifyChar).then(() => {
                            //     console.log('Started notification on ' + peripheral.id);
                            // }).catch((err) => {
                            //     console.log('Notification error', err);
                            // });
                            this.handleUpdateValueForCharacteristic({peripheral: peripheral.id, value: [7]});

                        });

                    //}, 900);
                }).catch((error) => {
                    console.log('Connection error', error);
                });
            }
        }
    }

    render () 
    {
        const list = Array.from(this.state.peripherals.values());
        const dataSource = ds.cloneWithRows(list);
        let autoColor = '#ccc';

        return (
            <SafeAreaView style = {styles.container}>
                <TouchableHighlight
                    style = {{
                        marginTop: 10,
                        // marginRight: 50,
                        margin: 20,
                        padding: 20,
                        backgroundColor:'#ccc'
                    }}
                    onPress = {() => this.props.navigation.navigate('Dashboard')}
                >
                    <Text>Back to Dashboard</Text>
                </TouchableHighlight>
                <TouchableHighlight 
                    style = {{
                        marginTop: 0,
                        margin: 20, 
                        padding:20, 
                        backgroundColor:'#ccc'
                    }} 
                    onPress = {() => this.startScan() }
                >
                    <Text>Scan Bluetooth ({this.state.scanning ? 'on' : 'off'})</Text>
                </TouchableHighlight>
                <TouchableHighlight 
                    style = {{
                        marginTop: 0,
                        margin: 20, 
                        padding:20, 
                        backgroundColor:'#ccc'
                    }} 
                    onPress = {() => this.retrieveConnected() }
                >
                    <Text>Retrieve connected peripherals</Text>
                </TouchableHighlight>
                {/* <TouchableHighlight
                    onPress = {() => {
                        if (this.state.autoRead == false) {
                            this.state.autoRead = true;
                            console.log('autoRead: ' + this.state.autoRead);
                            autoColor = 'green';
                        } else {
                            this.state.autoRead = false;
                            autoColor = '#ccc';
                            console.log('autoRead: ' + this.state.autoRead);
                        }
                    }} 
                    style = {{
                        marginTop: 0,
                        margin: 20, 
                        padding:20, 
                        backgroundColor:'#ccc'
                    }}
                >
                    <Text>AutoScan ({this.state.autoRead})</Text>
                </TouchableHighlight> */}
                <ScrollView style = {styles.scroll}>
                    {
                        (list.length == 0) &&
                        <View style = {{ flex:1, margin: 20 }}>
                            <Text style = {{ textAlign: 'center' }}>No peripherals</Text>
                        </View>
                    }
                    <ListView
                        enableEmptySections = {true}
                        dataSource = {dataSource}
                        renderRow = {(item) => {
                            const color = item.connected ? 'green' : '#fff';
                            return (
                                <TouchableHighlight onPress={() => this.test(item) }>
                                    <View style={[ styles.row, { backgroundColor: color } ]}>
                                        <Text 
                                            style = {{
                                                fontSize: 12, 
                                                textAlign: 'center', 
                                                color: '#333333', 
                                                padding: 10
                                            }}
                                        >{item.name}</Text>
                                        <Text 
                                            style = {{
                                                fontSize: 8, 
                                                textAlign: 'center', 
                                                color: '#333333', 
                                                padding: 10
                                            }}
                                        >{item.id}</Text>
                                    </View>
                                </TouchableHighlight>
                            );
                        }}
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    async storeItem(key, item) {
        console.log('storeItem() was called; key: ' + key + ', item: ' + item);
        try {
            //we want to wait for the Promise returned by AsyncStorage.setItem()
            //to be resolved to the actual value before returning the value
            // var jsonOfItem = await AsyncStorage.setItem(key, JSON.stringify(item));
            var jsonOfItem = await AsyncStorage.setItem(key, item).then;
            return jsonOfItem;
        } catch (error) {
          console.log('storeItem(): ' + error.message);
        }
    }

    //the functionality of the retrieveItem is shown below
    async retrieveItem(key) {
        console.log('retreiveItem() was called; key: ' + key);
        try {
            var myData = undefined;
            const retrievedItem = await AsyncStorage.getItem(key).then((patchData) => {
                console.log('retrieved item is: ' + patchData);
                if(patchData != null) {
                    console.log('returning patchData:' + myData);
                    myData = patchData;
                } else {
                    console.log('returning undefined');
                }
            });

            return myData;
        //     var currentItem = '';
        //     var retrievedItem =  await AsyncStorage.getItem(key).then((patchData) => {
        //     console.log('retrieveItem(): got ' + patchData);
        //     currentItem = patchData;
        //   }, (error) => {
        //       console.log('retreiveItem() error: ' + error);
        //   });

        //   if (retrievedItem == undefined) {
        //       console.log('retriveItem() storing in try');
        //       this.storeItem(key, '0');
        //   }
        
        //   retrievedItem = await AsyncStorage.getItem(key);
        //   // const item = JSON.parse(retrievedItem);
        //   console.log('retrieveItem(); retrievedItem: ' + retrievedItem);
        //   const item = retrievedItem;
        //   return currentItem;
        } catch (error) {
        //   this.storeItem(key, '2');
        //   const retrievedItem = await AsyncStorage.getItem(key);
          console.log('retrieveItem(): ' + error.message);
          return retrievedItem;
        }
    }

    checkAlarm(volume) {
        var newAlarmList = this.props.globalState.alarmList;
        console.log("Check alarm: " + volume);
        for(var i = 0; i < newAlarmList.length; i++) {
            console.log('storedAlarm: ' + typeof(parseFloat(newAlarmList[i].threshold)) + ' <= nextVolume: ' + typeof(volume) + 'on? ' + newAlarmList[i].on);
            if(parseFloat(newAlarmList[i].threshold) <= volume && newAlarmList[i].on == "true") {
                // sendNotification();
                newAlarmList[i].on = "false";
                console.log('Trying to send notification');
                // PushNotification.localNotification({
                //     message: 'Threshold volume reached, current volume is ' + volume,
                //     // ongoing: true,
                //     // autoCancel: false,
                //     vibration: 30000
                // });
                console.log('Tried to send notification');
            }
        }
    
        this.props.setGlobalState({alarmList: newAlarmList});
    
        var alarmRecord = newAlarmList.length.toString();
        for(var i = 0; i < newAlarmList.length; i++) {
            alarmRecord = alarmRecord + ',' + newAlarmList[i].threshold + ',' + newAlarmList[i].on;
        }
    
        console.log("alarmRecord: " + alarmRecord);
    
        this.storeItem("alarmRecord", alarmRecord).then((stored) => {
                //this callback is executed when your Promise is resolved
                alert("Success writing");
                }).catch((error) => {
                //this callback is executed when your Promise is rejected
                console.log('Promise is rejected with error: ' + error);
        });
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        width: window.width,
        height: window.height
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        margin: 10,
    },
    row: {
        margin: 10
    },
});

export default withGlobalState(BLEManager);