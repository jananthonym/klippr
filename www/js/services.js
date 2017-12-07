angular.module('app.services', [])

.factory('BlankFactory', [function() {

}])

.service('userService', function($http, Backand, $rootScope, $q) {
    var self = this;
    var baseUrl = Backand.getApiUrl() + '/1/objects/';

    self.currentUser = {};

    function log(message) {console.log("userService: " + message);}
    function error(message) {console.error("userService: " + message);}

    /*
        Called when logging out
    */
    self.wipeUserDetails = function() {
        self.currentUser = angular.copy(null);
    }

    /*
        Called by controllers to load up the current user object
    */
    self.loadUserDetails = function(force) {
        if(!force && self.currentUser && self.currentUser.id != undefined){
            return $q.when(self.currentUser);
        }
        if (Backand.getUsername()) {
            return getCurrentUserInfo().then(function(data) {
                log("User Deets:\n"+JSON.stringify(data));
                self.currentUser = data;
                return data;
            });
        }
        return null;
    }

    /*
        Called by above
        GET request for current user
    */
    function getCurrentUserInfo() {
        return $http({
            method: 'GET',
            url: baseUrl + 'users',
            params: {
                exclude: "metadata",
                filter: {"fieldName": "email","operator": "equals","value": Backand.getUsername()}
            }
        }).then(function(response) {
            if (response.data && response.data.data && response.data.data.length == 1) {
                log("Got user details for " + Backand.getUsername());
                return response.data.data[0];
            }
        });
    }

    /*
        Gets COMPLETED haircuts of a given Employee regardless if set to be displayed on portfolio or public
        id: employee id
        return lists includes related employee objects
    */
    self.getEmployeesCompletedHaircuts = function(id) {
        return $http({
            method: 'GET',
            url: baseUrl + 'employees/' + id + '/haircuts',
            params: {
                relatedObjects: true,
                exclude: 'metadata',
                pageSize: 100,
                filter: [
                    {"fieldName": "status","operator": "equals","value": "completed"}
                    //{"fieldName": "public","operator": "equals","value": true},
                    //{"fieldName": "onPortfolio","operator": "equals","value": true}
                ]
            }
        });
    }

    /*
        GET all employees belonging to a given store/shop
        id: store/shop id
    */
    self.getAllActiveEmployeesFromStore = function(id) {
        return $http({
            method: 'GET',
            url: baseUrl + 'stores/' + id + '/employees',
            params: { 
                exclude: 'metadata',
                filter: { "fieldName": "status", "operator": "equals", "value": "ACTIVE" }
            }
        });
    }

    /*
        Search for users by name or email
        search: string to search for
    */
    self.searchUsers = function(search) {
        return $http({
            method: 'GET',
            url: baseUrl + 'users',
            params: {
                exclude: 'metadata',
                filter: {
                    "q": {
                        "$or": [
                            { "firstName": { "$like": search } },
                            { "lastName": { "$like": search } },
                            { "fullName": { "$like": search } },
                            { "email": { "$like": search } }
                        ]
                    }
                }
            }
        });
    }

    /*
        GET requested user object
        id: user id
    */
    self.getUser = function(id) {
        return $http({
            method: 'GET',
            url: baseUrl + 'users/' + id
        });
    }

    /*
        Create a users2 object, linking current user to another user
        id: user id of the other user
    */
    self.followUser = function(id) {
        return $http({
            method: 'POST',
            url: baseUrl + 'users2',
            data: {
                user: self.currentUser.id.toString(),
                friend_id: id
            }
        });
    }

    /*
        Delete users2 object linking current user to another user
        id: user id of other user
    */
    self.unfollowUser = function(id) {
        //get the users2 object first since we don't know its ID
        return $http({
            method: 'GET',
            url: baseUrl + 'users/' + self.currentUser.id + '/following',
            params: {
                filter: { "fieldName": "friend_id", "operator": "equals", "value": id.toString() }
            }
        }).then(function(response) {
            //NOW we delete it
            if (response.data.data) {
                var fid = response.data.data[0].id;
                return $http({
                    method: 'DELETE',
                    url: baseUrl + 'users2/' + fid,
                });
            }
            return null;
        });
    }

    /*
        Search for stores around a given location within a radius determined from the settings
        location: [lat, long]
    */
    self.searchForStore = function(location) {
        log("looking for stores less than " + parseInt(self.currentUser.searchRange, 10) + " miles close");
        return $http({
            method: 'GET',
            url: baseUrl + 'stores',
            params: {
                exclude: 'metadata',
                filter: {
                    "q": {
                        "location": {"$withinMiles": [location, parseInt(self.currentUser.searchRange, 10)]}
                    }
                }
            }
        });
    }

    /*
        Get availabe employees from a given store on a given date at a given time
        id: store id
        date: dateTime
        noTime: boolean if a time is provided (ex. if true, get all employees free that day at any time)
    */
    self.getFreeEmployees = function(id, date, noTime) {
        log("getting available employee from " + id);

        var reqDate = null;
        if (date) //date was given so convert it to UTC string
            reqDate = getDateTime(date);
        //log("reqDate: "+reqDate);

        return $http({
            method: 'GET',
            url: Backand.getApiUrl() + '/1/objects/action/employees/1?name=availableEmployees',  //CUSTOM ACTION in backand
            params: {
                parameters: {
                    store_id: id,
                    date: reqDate,
                    sort: {"fieldName": "stars","order": "desc"},
                    noTime: noTime
                }
            }
        });
    }

    /*
        Check if current user has an appointment coming up, or was declined, or awaits review
        Can be:
        -pending
        -confirmed
        -declined & !dismissedByUser
        -completed & !dismissedByUser
        Should never pull:
        -cancelled
    */
    self.getUpcomingCut = function() {
        log("Checking for Appointment");
        
        return $http({
            method: 'GET',
            url: baseUrl + 'users/' + self.currentUser.id + '/haircuts',
            params: {
                relatedObjects: true,
                exclude: 'metadata',
                sort: [{"fieldName": "time","order": "desc"}],
                filter:  {"fieldName": "dismissedByUser", "operator": "equals", "value": "0"} //the backend saves self boolean field as an int
            }
        });
    }

    /*
        Create comments object
        comment: content string
        haircut: haircut id to link comment to
    */
    self.postComment = function(comment, haircut) {
        log("Posting Comment");
        var currentdate = getDateTime();
        return $http({
            method: 'POST',
            url: baseUrl + 'comments',
            data: {
                content: comment,
                time: currentdate,
                user: self.currentUser.id,
                haircut: haircut.id
            },
            params: {returnObject: true}
        });
    }

    function getStoreID(code) {
        return $http({
            method: 'GET',
            url: baseUrl + 'stores',
            params: {
                filter: {"fieldName": "code","operator": "equals","value": code}
            }
        }).then(function(response) {
            if (response.data.data && response.data.data.length == 1)
                return response.data.data[0].id;
            return null;
        });
    }

    /*
        Create Employee Account with "PENDING" status
        code: store code
    */
    self.createEmployee = function(code) {
        log("Creating Employee");
        return getStoreID(code).then(function(store) {
            if (store) {
                return $http({
                    method: 'POST',
                    url: baseUrl + 'employees',
                    data: {
                        firstName: self.currentUser.firstName,
                        lastName: self.currentUser.lastName,
                        pic: self.currentUser.pic,
                        store: store.toString(),
                        status: "PENDING"
                    },
                    params: {
                        returnObject: false
                    }
                });
            }
            return null;
        });
    }

    /*
        Get Coupons of user
    */
    self.getRedeemedCoupons = function() {
        log("Getting redeemed coupons");
        return $http({
            method: 'GET',
            url: baseUrl + 'users/' + self.currentUser.id + '/redeemedCoupons',
            params: {
                exclude: 'metadata',
                sort: [{"fieldName": "value","order": "desc"}],
            }
        });
    }

    /*
        Check if coupon is valid and get its object
    */
    self.retrieveCoupon = function(code) {
        log("Retrieving coupon");
        return $http({
            method: 'GET',
            url: baseUrl + 'coupons',
            params: {
                exclude: 'metadata',
                filter: {"fieldName": "code","operator": "equals","value": code}
            }
        });
    }

    /*
        POST a coupon object linked to current user
        data: coupon object
    */
    self.addCoupon = function(data) {
        log("Redeeming coupon");
        return $http({
            method: 'POST',
            url: baseUrl + 'redeemedCoupons',
            data: data
        });
    }

    /*
        Get comments of a given haircut
        id: haircut id
    */
    self.getComments = function(id) {
        log("Getting comments for haircut: " + id);
        return $http({
            method: 'GET',
            url: baseUrl + 'haircuts/' + id + '/comments',
            params: {
                relatedObjects: true,
                exclude: 'metadata',
                sort: [{"fieldName": "time","order": "asc"}]
            }

        });
    }

    /*
        Add or remove like (checks whether like exists or not beforehand)
        haircut: haircut ID to add/remove like from
        mode: "add" or "remove"
    */
    self.addRemoveLike = function(haircut, mode) {
        log(mode + " like");
        if (mode == 'add') { //ADD like
            return $http({
                method: 'POST',
                url: baseUrl + 'likes',
                data: {
                    user: self.currentUser.id,
                    haircut: haircut.id
                },
                params: {returnObject: false}
            });
        } else { //REMOVE Like
            return $http({
                method: 'GET',
                url: baseUrl + 'haircuts/' + haircut.id + '/likes',
                params: {
                    exclude: 'metadata',
                    filter: [{ "fieldName": "user", "operator": "in", "value": self.currentUser.id }]
                }
            }).then(function(response) {
                //log("GET like repsonse:\n"+JSON.stringify(response, null, 2));
                if (response.data && response.data.data && response.data.data.length == 1) {
                    log("Like Exists, deleting");
                    var like = response.data.data[0];
                    return $http({
                        method: 'DELETE',
                        url: baseUrl + 'likes/' + like.id
                    });
                }
                return null;
            });
        }
    }

    /*
        Create a haircut object
        haircut: haircut object (JSON)
    */
    self.makeAppointment = function(haircut) {
        return $http({
            method: 'POST',
            url: baseUrl + 'haircuts',
            data: haircut,
            params: {returnObject: false}
        });
    }

    /*
        Update Users object
        id: user id
        object: updated user object
    */
    self.updateUser = function(object) {
        return $http({
            method: 'PUT',
            url: baseUrl + 'users/' + self.currentUser.id,
            data: object,
            params: {returnObject: false}
        });
    }

    /*
        Change status of haircut object from pending to cancelled
        id: haircut id to modify
    */
    self.cancelCut = function(id) {
        log("Cancelling Appointment: " + id);
        var data = {
            status: "cancelled",
            cancelledDate: getDateTime(),
            dismissedByUser: true
        };
        return self.modifyCut(id, data);
    }

    /*
        Check In user to appointment
        id: haircut ID
    */
    self.checkIn = function(id) {
        log('Checking in');
        var data = {checkedIn: getDateTime()};

        return self.modifyCut(id, data);
    }

    /*
        Update Cut object
        id: haircut id
        data: new data
    */
    self.modifyCut = function(id, data) {
        return $http({
            method: 'PUT',
            url: baseUrl + 'haircuts/' + id,
            data: data,
            params: {returnObject: false}
        });
    }

    /*
        Get array of user IDs current user is following
    */
    self.getFriends = function() {
        var friends = [];
        return $http({
            method: 'GET',
            url: baseUrl + 'users/' + self.currentUser.id + '/following',
            params: {
                exclude: 'metadata',
                pageSize: 1000
            }
        });
    }

    /*
        Get haircuts of people current user is following
        date: dateTime to get haricuts before or after (determined by mode)
        pageSize: max size to get at a time
        mode: "new" or "old"
    */
    self.getFriendFeed = function(date, pageSize, mode) {
        return self.getFriends().then(function(response) {
            var friends = [];
            if(response.data.data){
                angular.forEach(response.data.data, function(data) {
                    friends.push(parseInt(data.friend_id, 10));
                });
                if (friends.length > 0) {
                    log("getting hair");
                    return getFeed(date, pageSize, friends, mode);
                }
            }
            return null;
        });
    }

    /*
        Get current user's haircuts
        date: dateTime to get haricuts before or after (determined by mode)
        pageSize: max size to get at a time
        mode: "new" or "old"
    */
    self.getMeFeed = function(date, pageSize, mode) {
        return getFeed(date, pageSize, null, mode);
    }

    /*
        Get haircuts of given user
        date: dateTime to get haricuts before or after (determined by mode)
        pageSize: max size to get at a time
        mode: "new" or "old"
    */
    self.getProfile = function(id, date, pageSize, mode) {
        return getFeed(date, pageSize, null, mode, id);
    }

    /*
        Get haircuts for the above 3 functions
    */
    function getFeed(date, pageSize, friends, mode, id) {
        var filter;
        var url;

        if (mode == "old") { //old filter

            if (friends) // friends
                filter = [
                    { "fieldName": "user", "operator": "in", "value": friends.toString() }, //has to be of a friend
                    { "fieldName": "time", "operator": "lessThan", "value": date }, //for older cards
                    { "fieldName": "public", "operator": "equals", "value": true }, //has to be public  
                    { "fieldName": "status", "operator": "equals", "value": "completed" }
                ]; //status should be completed
            else if (!id) //current user
                filter = [
                    { "fieldName": "user", "operator": "in", "value": self.currentUser.id }, //has to be of current user's
                    { "fieldName": "time", "operator": "lessThan", "value": date }
                ]; //for older cards
            else // another user's
                filter = [
                    { "fieldName": "time", "operator": "lessThan", "value": date },
                    { "fieldName": "public", "operator": "equals", "value": true }, //has to be public  
                    { "fieldName": "status", "operator": "equals", "value": "completed" }
                ]; //status should be completed

        } else { //new filter

            if (friends)
                filter = [{ "fieldName": "user", "operator": "in", "value": friends.toString() }, //has to be of a friend
                    { "fieldName": "time", "operator": "greaterThan", "value": date }, //for newer cards
                    { "fieldName": "public", "operator": "equals", "value": true }, //has to be public  
                    { "fieldName": "status", "operator": "equals", "value": "completed" }
                ]; //status should be completed
            else if (!id)
                filter = [
                    { "fieldName": "user", "operator": "in", "value": self.currentUser.id }, //has to be of current user's
                    { "fieldName": "time", "operator": "greaterThan", "value": date }
                ]; //status should be completed
            else
                filter = [
                    { "fieldName": "time", "operator": "greaterThan", "value": date }, //for older cards
                    { "fieldName": "public", "operator": "equals", "value": true }, //has to be public  
                    { "fieldName": "status", "operator": "equals", "value": "completed" }
                ]; //status should be completed
        }

        if (id)
            url = baseUrl + 'users/' + id + '/haircuts';
        else
            url = baseUrl + 'haircuts/';

        return $http({
            method: 'GET',
            url: url,
            params: {
                pageSize: pageSize,
                relatedObjects: true,
                exclude: "metadata",
                sort: [{"fieldName": "time","order": "desc"}],
                filter: filter
            }
        });
    }

    /*
        Get the availibity object of an employee
        id: employee ID
    */
    self.getHours = function(id) {
        return $http({
            method: 'GET',
            url: baseUrl + 'employees/' + id + '/availability',
            params: {
                exclude: 'metadata'
            }
        });
    }

    function getStoreServices(id) {
        return $http({
            method: 'GET',
            url: baseUrl + 'stores/' + id + '/services',
            params: {
                exclude: 'metadata',
                pageSize: 100
            }
        }).then(function(response){
            //log("sServices:\n"+JSON.stringify(response, null, 2));
            if(response.data.data){
                return response.data.data;
            }else{
                return [];
            }
        })
    }
                        
    /*
        Get the 'storeServices' of given employee
        e_id: employee ID
        s_id: store ID

        Note: self implementation fucking sucks. back& doesn't suport filtering by ID in a array
    */
    self.getEmployeeServices = function(e_id, s_id) {
        log('Getting employee\'s services');
        var eServicesID = [];
        var eServicesObj = [];
        //first get 'employeeServices'
        return $http({
            method: 'GET',
            url: baseUrl + 'employees/' + e_id + '/services',
            params: {exclude: 'metadata'}
        }).then(function(response){
            //log("eservices:\n"+JSON.stringify(response.data.data, null, 2));
            if (response.data.data) {
                angular.forEach(response.data.data, function(data) {
                    eServicesID.push(parseInt(data.serviceID, 10)); //these are just the IDs of the the storeServices the employee has
                });
                //now we get the real service objects 
                return getStoreServices(s_id).then(function(result){
                    if(result.length > 0){
                        angular.forEach(result, function(obj){          //go through each storeService and check if it's ID is in the array of IDs the employee has
                            if( eServicesID.indexOf( obj.id ) != -1 ){
                                eServicesObj.push(obj);
                            }
                        });
                        return eServicesObj;
                    }else{
                        return [];
                    }
                });

            }else{
                return [];
            }
        },function(err){
            error("eservices:\n"+JSON.stringify(err, null, 2));
            return null;
        });
    }

    /*
       Run custom backend action to adjust given employee's rating
        id: employee id
        rate: number 1-5
    */
    self.adjustEmployeeRating = function(id, rate){
        log("Adjusting Employee Rating");
        return $http({
            url: baseUrl + 'action/employees/'+id+'/?name=adjustRating',
            params: {
                parameters: {
                    rate: rate
                }
            }
        });
    }

    /*
        Refund a haircut (calls custom backend action)
        id: haircut id
    */
    self.refundCut = function(id, amount){
        return $http ({
            method: 'GET',
            url: baseUrl + 'action/haircuts/'+ id +'/?name=refundCut',
            params: {
                parameters: {amount : amount}
            }
        });
    }

    /*
        Get geographical coordinates of a string location
        address: string location (eg. 123 coles st)
    */
    self.getGeo = function(address) {
        var newAddress = address.replace(/\s\s+/g, ' ');
        return $http({
            method: 'GET',
            url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(newAddress) + '&key=AIzaSyDYbLYxN9fIH_fpxMWiXjThFvLMVH06seM',
        });
    }

    /*
        Ouput UTC of given or current dateTime in ISO format 
        q: dateTime (optional)
    */
    function getDateTime(q) {
        var now = q ? new Date(q) : new Date();
        return now.format("UTC:yyyy-mm-dd'T'HH:MM:ss");
    }
})

.service('PushService', function(Backand, $http) {
    var self = this;
    var actionUrl = Backand.getApiUrl() + '/1/objects/action/pushNotification/?name=';

    function log(message) {console.log("PushService: " + message);}
    function error(message) {console.error("PushService: " + message);}

    /*
        Send a push notification to an employee
        email: email of employee to send to
        message: content of message to send

    */
    self.pushEmployee = function(email, message){
        log("Sending Employee a Notification");
        return $http({
            url: actionUrl + 'sendToEmployee',
            params: {
                parameters: {
                    message: {
                        //included_segments: ["All"],
                        data: {targetState: "tabsController.appointment"},
                        contents: {"en": message},
                        headings: {"en": "Klippr-Partner"},
                        tags: [{"key": "email", "relation": "=", "value": email}],
                        android_accent_color: "ffc900"
                    }
                }
            }
        });
    }

    /*
        Send a push notification to a user
        email: email of user to send to
        message: content of message to send

    */
    self.pushUser = function(email, message){
        log("Sending User a Notification");
        return $http({
            url: actionUrl + 'sendToUser',
            params: {
                parameters: {
                    message: {
                        //included_segments: ["All"],
                        data: {targetState: "tabsController.appointment"},
                        contents: {"en": message},
                        headings: {"en": "Klippr"},
                        tags: [{"key": "email", "relation": "=", "value": email}],
                        android_accent_color: "ffc900"
                    }
                }
            }
        });
    }

    /*
        Send a push notification to a store
        email: email of store to send to
        message: content of message to send

    */
    self.pushStore = function(email, message){
        log("Sending Store a Notification");
        return $http({
            url: actionUrl + 'sendToStore',
            params: {
                parameters: {
                    message: {
                        //included_segments: ["All"],
                        data: {targetState: "tabsController.appointment"},
                        contents: {"en": message},
                        headings: {"en": "Klippr"},
                        tags: [{"key": "email", "relation": "=", "value": email}],
                        android_accent_color: "ffc900"
                    }
                }
            }
        });
    }
})

.service('PopupService', function($ionicPopup, $ionicLoading) {
    var self = this;

    self.showLoad = function() {
        $ionicLoading.show({
            template: '<ion-spinner class="spinner-energized"></ion-spinner>',
            noBackdrop: true
        });
    }

    self.hideLoad = function() {
        $ionicLoading.hide();
    }

    self.showAlert = function(title, template) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: template,
            okType: 'button-energized'
        });
        return alertPopup.then(function(res) {
            return res;
        });
    }

    self.showConfirm = function(title, template) {
        var confirmPopup = $ionicPopup.confirm({
            title: title,
            template: template,
            okType: 'button-energized'
        });
        return confirmPopup.then(function(res) {
            return res;
        });
    }
})

.service('StripeService', function(Backand, $http) {
    var self = this;

    var actionUrl = Backand.getApiUrl() + '/1/objects/action/stripe/?name=';

    function log(message) {console.log("StripeService: " + message);}
    function error(message) {console.error("StripeService: " + message);}

    /*
        Create new customer
        description: description
        card: card object
    */
    self.createCustomer = function(description, token) {
        return $http({
            url: actionUrl + 'createCustomer',
            params: {
                parameters: {
                    customer:{
                        email: description,
                        source: token
                    }
                }
            }
        });
    }

    /*
        Get an existing customer in stripe
        cus_id: cus_id of stripe customer
    */
    self.getCustomer = function(cus_id) {
        return $http({
            method: 'GET',
            url: actionUrl + 'getCustomer',
            params: {
                parameters: {
                    cus_id: cus_id
                }
            }
        });
    }

    /*
        Get a customer's cards
        cus_id: cus_id of stripe customer
    */
    self.getCards = function(cus_id) {
        return $http({
            url: actionUrl + 'getCards',
            params: {
                parameters: {
                    cus_id: cus_id
                }
            }
        });
    }

    /*
        Remove an existing customer's card
        cus_id: cus_id of stripe customer
        card_id: card_id of card to remove
    */
    self.removeCard = function(cus_id, card_id) {
        return $http({
            method: 'GET',
            url: actionUrl + 'deleteCard',
            params: {
                parameters: {
                    cus_id: cus_id,
                    card_id: card_id
                }
            }
        });
    }

    /*
        Add card to existing customer
        cus_id: cus_id of stripe customer
        card: card object
    */
    self.addCard = function(cus_id, token, email) {
        return $http({
            method: 'GET',
            url: actionUrl + 'addCard',
            params: {
                parameters: {
                    cus_id: cus_id,
                    token: token,
                    email: email
                }
            }
        });
    }

    self.updateCard = function(cus_id, card_id, card){
        return $http({
            url: actionUrl + 'updateCard',
            params: {
                parameters: {
                    cus_id: cus_id,
                    card_id: card_id,
                    card: card
                }
            }
        });
    }

    /*
        Get charge object
        chargeID: charge_id of object
    */
    self.getCharge = function(chargeID){
        return $http ({
            method: 'GET',
            url: actionUrl + 'getCharge',
            params: {
                parameters:{
                    charge_id: chargeID,
                }
            }
        });
    }
})

.service('LoginService', function(Backand) {
    var service = this;

    service.signin = function(email, password, appName) {return Backand.signin(email, password);};

    service.socialSignIn = function(provider) {return Backand.socialSignIn(provider);};

    service.socialSignUp = function(provider) {return Backand.socialSignUp(provider);};

    service.signout = function() {return Backand.signout();};

    service.signup = function(firstName, lastName, email, password, confirmPassword) {
        return Backand.signup(firstName, lastName, email, password, confirmPassword);
    }
})

.service('APIInterceptor', function($rootScope, $q) {
    var service = this;

    service.responseError = function(response) {
        if (response.status === 401) {
            console.log('APIInterceptor unauthorized');
            $rootScope.$broadcast('unauthorized');
        }
        return $q.reject(response);
    };
});