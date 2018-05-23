import React, { Component } from 'react';
import {
    // AppRegistry,
    StyleSheet,
    Text,
    View,
    // TouchableHighlight,
    // NativeAppEventEmitter,
    // NativeEventEmitter,
    // NativeModules,
    // Platform,
    // PermissionsAndroid,
    Button,
    Spacer,
    ListView,
    ScrollView,
    AppState,
    Dimensions,
} from 'react-native';
// import BleManager from 'react-native-ble-manager';
import { SafeAreaView } from 'react-navigation';
import { Buffer } from 'buffer';
import { withGlobalState } from 'react-globally';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, Grid } from 'react-native-svg-charts'
import FeedbackComponent from './FeedbackComponent';
import { withNavigation } from 'react-navigation';

// import BackgroundTask from 'react-native-background-task';

const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

class ProfileComponent extends Component 
{
    // static navigationOptions = ({ navigation }) => ({
    //     headerTitle: 'History',
    //     headerRight: (<Icon name="notifications" size={30} onPress={() => navigation.navigate('Alerts')}/>),
    // });

    constructor() 
    {
        super();

       // { familyName: 'Huang',
       //             givenName: 'Hugo',
       //             email: 'whenkek@gmail.com',
       //             doctorFamilyName: 'Ng',
       //             doctorGivenName: 'Nicholas',
       //             doctorEmail: 'nicholas.michael.ng@gmail.com' }

        this.state = {
            familyName: '',
            givenName: '',
            email: '',
            doctorFamilyName: '',
            doctorGivenName: '',
            doctorEmail: ''
        }

        this.fetchProfile = this.fetchProfile.bind(this);
        // this.convertUTCDateToLocalDate = this.convertUTCDateToLocalDate.bind(this);
    }

    // convertUTCDateToLocalDate(date) {
    //     var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

    //     var offset = date.getTimezoneOffset() / 60;
    //     var hours = date.getHours();

    //     newDate.setHours(hours - offset);

    //     return newDate;   
    // }

    fetchProfile() {
        var postObj = {
            authCode: this.props.globalState.authCode,
            id: this.props.globalState.id,
        };
        console.log(postObj);
        //if able to pos
        fetch('https://majestic-legend-193620.appspot.com/fetch/singleMeta', {
        // fetch('https://majestic-legend-193620.appspot.com/insert/reading', {
        // fetch('http://192.168.43.198:8080/mobile/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postObj)

        })
        .then((result) => result.json())
        .then((json) => {
            console.log('Send done');
            console.log(json);

            this.setState({
                familyName: json.familyName,
                givenName: json.givenName,
                email: json.email,
                doctorFamilyName: json.doctorFamilyName,
                doctorGivenName: json.doctorGivenName,
                doctorEmail: json.doctorEmail
            });


            // var csvArr = json.csv.split(/,|\n/);
            // csvArr.pop();
            // var numEntries = csvArr.length/65;

            // var newList = [];
            // for(var i = 0, j = 0; i < numEntries; i++) {
            //     var time = csvArr[i * 65];
            //     var newTime = this.convertUTCDateToLocalDate(new Date(time));
            //     console.log("Time is: " + newTime);
            //     var sum = 0;
            //     for(j = 1; j < 65; j++) {
            //         sum += parseInt(csvArr[i * 65 + j]);
            //     }
            //     var avg = sum / 64;
            //     newList.push({"time": newTime.toString(), "reading": avg});
            //     console.log("Reading is: " + avg);
            // }

            // console.log(newList);

            // this.setState({historyList: newList});
        }).catch((error) => {
            console.log("ERROR in send " + error);
        });
    }

    render () 
    {
        const {navigate} = this.props.navigation;
        
        return (
            <SafeAreaView>
                <Text>Personal Information:</Text>
                <Text>{this.state.givenName}, {this.state.familyName}</Text>
                <Text>{this.state.email}</Text>

                <Text>Doctor Information:</Text>
                <Text>{this.state.doctorGivenName}, {this.state.doctorFamilyName}</Text>
                <Text>{this.state.doctorEmail}</Text>

                <Button
                    title = "Fetch"
                    onPress = {this.fetchProfile}
                />

                <Button
                    title = "Request doctor change"
                    onPress = {() => {navigate("RequestDoctorChange")}}
                />
            </SafeAreaView>
        );
        // const list = this.state.historyList;
        // const list = Array.from(this.state.peripherals.values());
        // const list = [
        //     {"time": 0, "reading": 1},
        //     {"time": 1, "reading": 10},
        //     {"time": 2, "reading": 8},
        //     {"time": 3, "reading": 12},
        //     {"time": 4, "reading": 14},
        //     {"time": 5, "reading": 1},
        //     {"time": 6, "reading": 10},
        //     {"time": 7, "reading": 8},
        //     {"time": 8, "reading": 12},
        //     {"time": 9, "reading": 14},
        //     {"time": 10, "reading": 1},
        //     {"time": 11, "reading": 10},
        //     {"time": 12, "reading": 8},
        //     {"time": 13, "reading": 12},
        //     {"time": 14, "reading": 14}
        // ];
        // const dataSource = ds.cloneWithRows(list);
        
    //     return (
    //         <SafeAreaView>
    //             <Text>Hi</Text>
    //         </SafeAreaView>
    //     );
    // }
    //     const list = Array.from(this.state.peripherals.values());
    //     const dataSource = ds.cloneWithRows(list);
    //     const data = [ 50, 10, 40, 95, -4, -24, 85, 91, 35, 53, -53, 24, 50, -20, -80 ];
    //     const {navigate} = this.props.navigation;
    //     return (
    //         <SafeAreaView style = {styles.container}>
    //         <LineChart
    //             style={ { height: 200 } }
    //             data={ data }
    //             contentInset={ { top: 20, bottom: 20 } }
    //             svg={{
    //                 strokeWidth: 2,
    //                 stroke: 'url(#gradient)',
    //             }}
    //         >
    //             <Grid/>
    //         </LineChart>
    //         <View 
    //             style={{
    //                 flexDirection: 'row',
    //                 alignItems: 'center',
    //                 justifyContent: 'center',
    //             }} >
    //             <View style={{
    //                 flex: 1,
    //                 marginLeft: window.width*0.1,
    //                 marginRight: window.width*0.1,
    //             }}>
    //             <Button
    //                 title = 'Refresh'
    //                 onPress = {this.fetchReading}
    //             />
    //             </View>
    //             <View style={{
    //                 flex: 1,
    //                 marginRight: window.width*0.1,
    //                 marginLeft: window.width*0.1
    //             }}>
    //             <Button 
    //                 title = 'Submit Event'
    //                 onPress = {() => {
    //                         if(this.props.globalState.email != '') {
    //                             navigate('Feedback');
    //                         }
    //                         else {
    //                             alert("Please sign in first");
    //                         }
    //                     }
    //                 }
    //             />
    //             </View>
    //         </View>

    //         <ScrollView style = {styles.scroll}>
    //         {
    //             (list.length == 0) &&
    //             <View style = {{ flex:1, margin: 20 }}>
    //                 <Text style = {{ textAlign: 'center' }}>No history available</Text>
    //             </View>
    //         }
    //             <ListView
    //                 enableEmptySections = {true}
    //                 dataSource = {dataSource}
    //                 renderRow = {(item) => {
    //                 // const color = item.connected ? 'green' : '#fff';
    //                     return (
    //                         // <TouchableHighlight onPress={() => this.test(item) }>
    //                         <View style= {[ styles.row, { backgroundColor: 'white'} ]}>
    //                             <Text 
    //                                 style = {{
    //                                     fontSize: 14, 
    //                                     textAlign: 'center', 
    //                                     color: '#333333', 
    //                                     padding: 10,
    //                                 }}
    //                             >Timestamp: {item.time}</Text>
    //                             <Text 
    //                                 style = {{
    //                                     fontSize: 12, 
    //                                     textAlign: 'center', 
    //                                     color: '#333333', 
    //                                     padding: 10,
    //                                 }}
    //                             >Average reading: {item.reading}</Text>
    //                         </View>
    //                     );
    //                 }}
    //             />
    //         </ScrollView>
    //     </SafeAreaView>
    //     );
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        width: window.width,
        height: window.height,
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


export default withGlobalState(ProfileComponent);