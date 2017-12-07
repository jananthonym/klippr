angular.module('app.controllers', [])
/*
.controller('tabsControl', function($scope, $state, $ionicHistory, $ionicNativeTransitions) {
	$scope.middleTab = function(){
		var current = $ionicHistory.currentStateName();
		console.log("current: "+current);
		if(current == 'tabsController.feed'){
			console.log("slide left");
            $ionicNativeTransitions.stateGo('tabsController.request', {
			    "type": "slide",
			    "direction": "left", // 'left|right|up|down', default 'left' (which is like 'next')
			});
        }else{
  			$ionicNativeTransitions.stateGo('tabsController.request', {
			    "type": "slide",
			    "direction": "right", // 'left|right|up|down', default 'left' (which is like 'next')
			});
        }
	}
})
*/
.controller('searchCtrl', function($scope, userService, $rootScope, $timeout, $state) {
	var timeoutId = null;

	$scope.searchResults = [];
	$scope.data = {
		search: '',
		currentUserID: 0
	};

	var friends = [];
	var gotFriends = false;
	var ready = false;

	function log(message){console.log("searchCtrl: "+message);}
	function error(message){console.error("searchCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {
	    viewData.enableBack = true;
	});

	$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){ 
		//Just Followed or unfollowed someone, reset following list
    	if(toState.name =="search" && fromState.name=="profileView" && $rootScope.newFollowEvent){
    		$rootScope.newFollowEvent = false;
			$scope.searchResults = [];
			gotFriends = false;
		}
	});

	function getUserDetails(){
		userService.loadUserDetails(false).then(function(details) {
			ready = true; //ready to search
			$scope.data.currentUserID = userService.currentUser.id;
		});
	}
	getUserDetails();

	$scope.personClick = function(user) {
		$rootScope.selectedProfile = user;
		$state.go('profileView');
	};

	$scope.$watch('data.search', function(newValue, oldValue) {
		if( newValue.length == 0){
			$scope.searchResults = [];
			return;
		}
		if (newValue == oldValue || timeoutId !== null || !ready) return;

		timeoutId = $timeout( function() {
        	$timeout.cancel(timeoutId);
        	timeoutId = null;

        	userService.searchUsers(newValue).then(function(result) {
        		//Check if we know who we're following already
        		if(!gotFriends){
        			//didn't get it yet
					userService.getFriends().then(function(response) {
						if (response.data.data) {
							angular.forEach(response.data.data, function(data) {
								friends.push(parseInt(data.friend_id, 10));
							});

							gotFriends = true;
							log("Following Users: " + friends);

							//now go through each search result and determine if current user is following it
							angular.forEach(result.data.data, function(data2) {
								if (friends.includes(data2.id)) {
									data2.isAFriend = true;
								}
							});
						}

					}, function (err){
						errorjson("Could'nt get friends", err);
					});

        		}else{ //already have it
        			angular.forEach(result.data.data, function(data){
        				if(friends.includes(data.id)) //check if each result is a person user following
        					data.isAFriend = true;
        			});
        		}
        		$scope.searchResults = result.data.data;

        	}, function(err){
        		errorjson('Search users', err);
        	});
        }, 300); //ms to wait after the last change is detected	

	});
})

.controller('haircutCtrl', function($scope, userService, $rootScope, $state, $ionicHistory) {
	$scope.comment = "";
	$scope.comments = [];
	
	var haircut = $rootScope.haircut_data;
	$scope.data = { timeAgo: getTimeAgo(haircut.time) };

	function log(message){console.log("haircutCtrl: "+message);}
	function error(message){console.error("haircutCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {
	    viewData.enableBack = true;
	    getComments();
	});

	$scope.gotoBarber = function(barber){
		$rootScope.selectedEmployee = barber;
		$state.go('employeesPage');
	}

	function round(num){ return Number((num).toFixed(0)); }

	function getTimeAgo(ago){ //we have the 'ago' paramater because we need this function for comments as well
		var occurence = new Date(ago);
		var today = new Date();
		//year
		var difference = today - occurence;
		//log("difference: " + difference);
		if(difference < 0) {
			error("no/negative difference in time")
			return;
		}

		if(difference >= 31536000000){
			if(difference < (2 * 31536000000))
				return "1 year ago"
			else
				return round(difference/31536000000) + " years ago"

		}else if(difference >= 2592000000){
			if(difference < 2 * 2592000000)
				return "1 month ago"
			else
				return round(difference/2592000000) + " months ago"

		}else if(difference >= 604800000){
			if(difference < 2 * 604800000)
				return "1 week ago"
			else
				return round(difference/604800000) + " weeks ago"

		}else if(difference >= 86400000){
			if(difference < 2 * 86400000)
				return "Yesterday"
			else
				return round(difference/86400000) + " days ago"

		}else if(difference >= 3600000){
				if(difference < 2 * 3600000)
					return "1 hour ago"
				else
					return round(difference/3600000) + " hours ago"

		}else if(difference >= 60000){
				if(difference < 2 * 60000)
					return "1 minute ago"
				else
					return round(difference/60000) + " minutes ago"
		}
	}

	$scope.postComment = function(comment){
		if(comment == "") return;

		userService.postComment(comment, $rootScope.haircut_data).then(function(response){
			if(response.data){
				$scope.comment = "";
				$scope.comments.push(response.data);
			}else errorjson('Post Comment',response);

		},function(err){
			errorjson('Post Comment',err);
		});
	}

	function getComments(){
		userService.getComments($rootScope.haircut_data.id).then(function(response){
			if (response.data.data && response.data.data.length > 0) {
				$scope.comments = [];

				var result = response.data.data;
				var related = response.data.relatedObjects;
				angular.forEach(result, function(data) {
					data.user = related.users[data.user];
					data.timeAgo = getTimeAgo(data.time);
					log('time aghho:' + data.timeAgo);
					$scope.comments.push(data);
				});

				log("# of comments: " + $scope.comments.length);
			}else{
				error('No comments');
			}
		}, function(err){
			errorjson('Get Comments',err);
		});
	}
})

.controller('profileViewCtrl', function($scope, userService, $rootScope, $state, PopupService) {
	$scope.user = userService.currentUser;
	$scope.profile = $rootScope.selectedProfile;

	$scope.cards = [];
	var pageSize = 20;

	$scope.canLoadOld = true;

	function log(message){console.log("profileViewCtrl: "+message);}
	function error(message){console.error("profileViewCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {viewData.enableBack = true;});

	$scope.getProfile = function(mode){ //dont move this function, has to be before the init() (i think)
		var date = "";
		if(mode == "new" || mode =="initial"){
			mode = "new";
			log("getting new cards");
			if($scope.cards.length > 0)
				date = $scope.cards[0].time;
		}else{
			if($scope.cards.length == 0) return;
			var date = $scope.cards[$scope.cards.length-1].time;
			log("getting older cards");
		}
		
		return userService.getProfile($scope.profile.id, date, pageSize, mode).then(function(data){			
			PopupService.hideLoad();
			processCardData(data, mode);
		},function(err){
			errorjson('Get Profile',err);
		});
	}

	init();
	function init(){
		PopupService.showLoad(); 
		$scope.getProfile('initial');

		if($scope.profile.isAFriend)
			$scope.followButtonText = "Following";
		else
			$scope.followButtonText = "Follow";
	}

	$scope.viewCard = function(card){
		$rootScope.haircut_data = card;
		$state.go('haircut');
	}

	function processCardData(response, mode){
		var temp = [];

		if(!response.data.data){
			error("failed to get "+mode+" cards");
			$scope.$broadcast('scroll.infiniteScrollComplete');
			$rootScope.$broadcast('scroll.refreshComplete');
			return;
		}

		var data = response.data.data;
		var related = response.data.relatedObjects;			

		angular.forEach(data, function(data) {
			data.user = related.users[data.user];
			data.store = related.stores[data.store];
			data.employee = related.employees[data.employee];

			var likeArray = JSON.parse("[" + data.likes + "]");
			//find out if current user likes it
			if(likeArray.indexOf($scope.user.id) > -1){ data.liked = true;} else {data.liked = false;}
			//count number of likes
			data.numLikes=likeArray.length;
			//set local time string
			var tempDate = new Date(data.time);
			data.localTime = tempDate.format("dddd, mmm dS, yyyy, h:MM TT");

			temp.push(data);
		});
		//check if all the rest of the older cards were pulled
		if((mode == "old" || mode == "initial") && temp.length < pageSize){
			log("no more old cards");
			$scope.canLoadOld = false;
		}

		if(mode == "old") 	$scope.cards = $scope.cards.slice(0).concat(temp); //add to end of list
		else 				$scope.cards = temp.slice(0).concat($scope.cards); //add to beginning
				
		log("# of "+mode+" haircuts: "+temp.length);

		$scope.$broadcast('scroll.infiniteScrollComplete');
		$rootScope.$broadcast('scroll.refreshComplete');
	}

	$scope.followUnfollow = function(){
		if($scope.profile.isAFriend) unfollowPerson($scope.profile);
		else followPerson($scope.profile);
	}

	function followPerson(fuser) {
		if (fuser.isAFriend) return;
		userService.followUser(fuser.id);
		$scope.followButtonText = "Following"
		$rootScope.newFollowEvent = true;
		$scope.profile.isAFriend = true;
	}

	function unfollowPerson(fuser){
		if(!fuser.isAFriend) return;
		PopupService.showConfirm('', 'Stop Following '+ fuser.firstName + '?').then(function(res) {
			if(!res) return;
			userService.unfollowUser(fuser.id);	
			$scope.followButtonText = "Follow"	
			$rootScope.newFollowEvent = true;
			$scope.profile.isAFriend = false;
		});
	}
})

.controller('feedCtrl', function($scope, userService, $rootScope, $state, PopupService, StripeService) {
	$scope.cards = []; //array of haircuts to display in view
	var meCards = []; //haircuts that belong to user
	var friendCards = []; //haircuts that belong to friends

	var pageSize = 20; //how many haircuts to pull at a time

	var canLoadOldFriend = true; //stores if can load anymore older haircuts
	var canLoadOldMe = true;

	$scope.friendMode =true; //either friend mode of me mode

	function log(message){console.log("feedCtrl: "+message);}
	function error(message){console.error("feedCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	getUserData();
	function getUserData(){
		userService.loadUserDetails(false).then(function(result){
			if(!result) return;

			if($scope.cards.length < 1){
				PopupService.showLoad();
				$scope.getFeed("initial");
			}
		});
	}
	
    $scope.gotoBarber = function(barber){
		$rootScope.selectedEmployee = barber;
		$state.go('employeesPage');
	}

	//conducts a feed pull of most recent haircuts and replaces whats already been pulled
	function refresh(){
		log('Refreshing me feed');
		PopupService.showLoad();
		$scope.getFeed("initial");
	}

	$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams, $ionicHistory){ 
		// Check if User just cancelled an appointment
    	if(toState.name =="tabsController.feed" && $rootScope.justCancelled){
			$rootScope.justCancelled=false;
			$scope.friendMode = false;
			canLoadOldMe = true;
			refresh();
		}
		//Check if User's follow list changed
		if(toState.name =="tabsController.feed" && $rootScope.newFollow && $scope.friendMode == true){
			$rootScope.newFollow=false;
			canLoadOldFriend = true;
			refresh();
		}
	});
	//decide whether infinite scroll should trigger a pull or not
	$scope.canLoadOld = function(){
		if($scope.friendMode && canLoadOldFriend) return true;
		if(!$scope.friendMode && canLoadOldMe) return true;
		return false;
	}

	$scope.viewFriends = function(){
		if($scope.friendMode) return;
		$scope.friendMode = true;

		$scope.cards = friendCards;
		if(friendCards.length == 0){
			PopupService.showLoad();
			$scope.getFeed("initial");
		}
	}

	$scope.viewMe = function(){
		if(!$scope.friendMode) return;
		$scope.friendMode = false;

		$scope.cards = meCards;
		if(meCards.length == 0){
			PopupService.showLoad();
			$scope.getFeed("initial");
		}
	}

	$scope.viewCard = function(card){
		$rootScope.haircut_data = card;
		$state.go('haircut');
	}

	$scope.getFeed = function(mode){
		var date = "";
		var mode2 = mode;

		switch(mode) {
			//get haircuts newer than the date of the first one in the view
		    case 'new':
		        log("getting new cards");
				if($scope.cards.length > 0)
					date = $scope.cards[0].time;
		        break;
		    //get the latest haircuts
		    case 'initial':
		        mode2 = "new";
				date="";
				log("getting initial cards");
		        break;
		    //get haircuts older than the date of the last one in the view
		    default:
		        if($scope.cards.length == 0) return;
				date = $scope.cards[$scope.cards.length-1].time;
				log("getting older cards");
		}

		if ($scope.friendMode) { //get friends' haircuts
			log('getting friends feed');
			return userService.getFriendFeed(date, pageSize, mode2).then(function(response) {
				PopupService.hideLoad();
				if(response) processCardData(response, mode, "friend");
			}, function(err) {
				PopupService.hideLoad();
				error(JSON.stringify(err, null, 2));
			});

		} else { //get my haircuts
			log('getting my feed');
			return userService.getMeFeed(date, pageSize, mode2).then(function(response){			
				PopupService.hideLoad();
				if(response) processCardData(response, mode, "me");
			},function(err){
				PopupService.hideLoad();
				error(JSON.stringify(err, null, 2));
			});
		}
	}

	function processCardData(response, mode, mode2){
		var temp = [];	

		if(!response.data.data){
			error("failed to get "+mode+" cards");
			$scope.$broadcast('scroll.infiniteScrollComplete');
			$rootScope.$broadcast('scroll.refreshComplete');
			return;
		}

		var haircuts = response.data.data;
		var related = response.data.relatedObjects;

		angular.forEach(haircuts, function(data) {
			data.user = related.users[data.user];		//get the user object
			data.store = related.stores[data.store];	//get the store obj
			data.employee = related.employees[data.employee]; //get the employee object

			var likeArray = JSON.parse("[" + data.likes + "]"); //turn the likes into an array
			//find out if current user likes it
			if(isInArray(userService.currentUser.id, likeArray)){ data.liked = true;} else {data.liked = false;}
			//count number of likes
			data.numLikes=likeArray.length;

			//set local time string
			var tempDate = new Date(data.time);
			data.localTime = tempDate.format("dddd, mmm dS, yyyy, h:MM TT");

			//get status of charge
			//dont show servicePrice, show what was actually paid cuz coupon might have been used
            if (mode2 == "me" && data.charge_id.trim() != ''){
                StripeService.getCharge(data.charge_id).then(function(response) {
                    if (response){
                        data.paid = response.data.paid; //if true, price shown will be green, else red
                        var paid = parseInt(response.data.amount) - parseInt(response.data.amount_refunded);
                        paid = Number((paid/100).toFixed(2)); //was originally in cents
                        data.servicePrice = "$"+paid; //overwrite the og servicePrice
                    }
                });
            }else data.paid = false;

			temp.push(data);
		});
		//check if all the rest of the older cards were pulled so infinite-scroll can be disabled
		if((mode == "old" || mode == "initial") && temp.length < pageSize){
			log("no more old "+mode2+" card");
			if(mode2 =="friend"){
				canLoadOldFriend = false;
			}else{
				canLoadOldMe = false;
			} 
		}

		switch(mode) {
			//append to end
		    case 'old':
		        if(mode2 =="friend") friendCards = friendCards.slice(0).concat(temp); 
				else meCards = meCards.slice(0).concat(temp);
		        break;
		    //append to beginning
		    case 'new':
		        if(mode2 =="friend") friendCards = temp.slice(0).concat(friendCards);
				else meCards = temp.slice(0).concat(meCards);
		        break;
		    //overwrite existing list of haircuts
		    default:
		        if(mode2 =="friend") friendCards = temp;
				else meCards = temp;
		}
		//decide which list to display
		if($scope.friendMode) $scope.cards = friendCards; 
		else $scope.cards = meCards;
		
		log("# of "+mode+" haircuts: "+temp.length);

		$scope.$broadcast('scroll.infiniteScrollComplete');
		$rootScope.$broadcast('scroll.refreshComplete');
	}

	$scope.likeCut = function(index){
		var e = $scope.cards[index].liked;
		$scope.cards[index].liked = !e; //update local data

		if(!e){ //no error handling cause not critical
			userService.addRemoveLike($scope.cards[index], "add");
			$scope.cards[index].numLikes++;
		}else{
			userService.addRemoveLike($scope.cards[index], "remove");
			$scope.cards[index].numLikes--;
		}
	}

	//set to show or hide haircut from followers
	$scope.updatePublic = function(card){
		userService.modifyCut(card.id, {public: card.public}).then(function(response){
			log('Updated Public field')
		},function(err){
			errorjson('Update public field', err);
		});
	}

	function isInArray(value, array) {return array.indexOf(value) > -1;}
})

.controller('requestCtrl', function($scope, userService, PopupService, $state, $rootScope,$window, $cordovaGeolocation, $ionicHistory, $ionicNativeTransitions) {
	$scope.stores = {};

	$scope.dateValue;
	$scope.timeValue;

	$scope.minDate = new Date();
	$scope.maxDate = new Date();
	$scope.maxDate.setDate($scope.maxDate.getDate() + 21);

	var posOptions = {timeout: 20000, enableHighAccuracy: false, maximumAge: 120000};

	$scope.show = true;

	function log(message){console.log("requestCtrl: "+message);}
	function error(message){console.error("requestCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	checkForCut();
	function checkForCut(){
		PopupService.showLoad();
		userService.loadUserDetails(false).then(function(details) {
			if(!details) return;

			userService.getUpcomingCut().then(function(response){
				PopupService.hideLoad();

				if(response.data.data && response.data.data.length == 1){
                    log('Appointment found');
                    gotoAppointment();
				}else
					error('No upcoming cut');

			},function(err){
				errorjson('Check for appointments',err);
				PopupService.hideLoad();
				PopupService.showAlert('Error', 'Error checking for appointments. Please check network connection');
			});
		});
	}

	function gotoAppointment(){
		log("going to appointments");
		$ionicHistory.nextViewOptions({
			disableAnimate: true,
			disableBack: false,
			historyRoot: true
		});
		$ionicNativeTransitions.stateGo('tabsController.appointment', {}, {}, {
		    type: 'slide',
        	direction: 'left',
        	fixedPixelsTop: 50
		});
	}

	//called when search button is pressed, Not when view is loaded
	function getLocation(address){
		var location = [];
		// gps
		if(!address || address.trim() == ""){
			log("Using GPS");

			return $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position){
				location[0] = position.coords.latitude;
				location[1] = position.coords.longitude;
				return location;

			}, function(err){
				PopupService.hideLoad();
				errorjson("GPS error:", err);
				PopupService.showAlert("Location Error", "Problem finding GPS location, try setting manually.");
				return null;
			});

		// alternate address	
		}else{
			log("Using Geocoding");

			return userService.getGeo(address.trim()).then(function(response){
				if(response.data.results.length > 0){
					location[0] = response.data.results[0].geometry.location.lat;
					location[1] = response.data.results[0].geometry.location.lng;
					return location;

				}else{ //can still return '200' response without any results, so handle error twice
					PopupService.hideLoad();
					PopupService.showAlert('Location Error', "Couldn't get the coordinates of the entered address");
					errorjson('Geo service error',err);
					return null;
				}

			}, function(err){
				PopupService.hideLoad();
				PopupService.showAlert('Location Error', "Couldn't get the coordinates of the entered address");
				errorjson('Geo service error',err);
				return null;
			});
		}
	};
	//called when search button is pressed
	$scope.search = function(date, address) {
		log("input date:" + date);

		PopupService.showLoad();
		getLocation(address).then(function(location) { //get location first, getLocation() also handles errors getting location
			if (location && location.length == 2) {

				userService.searchForStore(location).then(function(response) {
					if (response.data.data && response.data.data.length > 0) {
						$scope.stores = [];
						//process each store in the response
						angular.forEach(response.data.data, function(data) {
							//caculate miles away and put it in the obj
							data.distanceAway = Number(distance(location[0], location[1], data.location[0], data.location[1]).toFixed(1));

							//No date was given so push all the employees
							if (date == null) {
								userService.getAllActiveEmployeesFromStore(data.id).then(function(e) {
									processEmployees(data, e);
								}, function(err) {
									PopupService.hideLoad();
									errorjson("Error getting active employees from store: " + data.id, err);
								});

							//Date was provided so check which employees from the store are available that day
							} else {
								userService.getFreeEmployees(data.id, date, noTime).then(function(result) {
									processEmployees(data, result);
								}, function(err) {
									PopupService.hideLoad();
									errorjson("Error getting active employees from store: " + data.id, err);
								});
							}
						});
					} else {
						error("Got no stores");
						PopupService.hideLoad();
						PopupService.showAlert('Search', "Couldn't find any in your area. Try increasing the search range in settings");
					}

				}, function(err) {
					PopupService.hideLoad();
					error("Search for stores", err);
				});
			}
		});
	}

	function processEmployees(store, response) {
		PopupService.hideLoad();
		if (response.data.data) {
			store.employees = response.data.data; //add employees into the store object
			if (store.employees && store.employees.length > 0) {	//if store has available employees, show store in view
				log("Pushing store: " + store.id);
				$scope.stores.push(store);
			} else log("NOT pushing store: " + store.id);
		}
	}

	$scope.viewStore = function(store){
		$rootScope.selectedStore = store;
		$state.go('storePage');
	}

	function distance(lat1, lon1, lat2, lon2, unit) {
		var radlat1 = Math.PI * lat1/180
		var radlat2 = Math.PI * lat2/180
		var radlon1 = Math.PI * lon1/180
		var radlon2 = Math.PI * lon2/180
		var theta = lon1-lon2
		var radtheta = Math.PI * theta/180
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		dist = Math.acos(dist)
		dist = dist * 180/Math.PI
		dist = dist * 60 * 1.1515
		if (unit=="K") { dist = dist * 1.609344 } 	//km
		return dist;
	}
})

.controller('storePageCtrl', function($scope, $rootScope, $state) {
	$scope.store = $rootScope.selectedStore;
	$scope.employees = [];
	function log(message){console.log("storePageCtrl: "+message);}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {viewData.enableBack = true;});

	getEmployees();
	function getEmployees(){
		angular.forEach($scope.store.employees, function(employee){
			if(employee.status.toLowerCase()=="active"){
				employee.stars = employee.totalStars/employee.numStars; //calculate the rating;
				employee.stars = Number((employee.stars).toFixed(1));
				$scope.employees.push(employee);
			}
		});
		log('Available employess: '+$scope.employees.length);
	}

	$scope.employeeClick = function(employee){
		$rootScope.selectedEmployee = employee;
		$state.go('employeesPage');
	}
})

.controller('employeesPageCtrl', function($scope, $rootScope, userService, $state, PopupService, $ionicHistory, PushService, $ionicModal) {
	$scope.employee = $rootScope.selectedEmployee; //employee object to display
	$scope.images = [];		//portfolio
	$scope.reviews = [];	//reviews (actually whole haircut objects that have a review written)
	$scope.services = [];	//services of employee
	$scope.data = {viewing: 'gallery'};		//mode of which of the 3 above is displayed (gallery, services, or reviews)

	function log(message){console.log("employeesPageCtrl: "+message);}
	function error(message){console.error("employeesPageCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {viewData.enableBack = true;});

	getPortfolio();
	function getPortfolio(){
		userService.getEmployeesCompletedHaircuts($scope.employee.id).then(function(response){
			if (response.data.data) {
				var related = response.data.relatedObjects;
				//process each haircut
				angular.forEach(response.data.data, function(data) {
					data.user = related.users[data.user];		//user object of who was cut
					data.store = related.stores[data.store];	//store object of where haircut took place

					if(data.onPortfolio && data.public) //only show if 'public' and 'onPortfolio'
						$scope.images.push(data.pic);

					if(data.employeeReview)
						$scope.reviews.push(data); //push the whole object, need the info of user who wrote it
				});
				log("Got " + $scope.images.length + " pics");

			} else error("Didn't get any completed haircuts from employee: "+ $scope.employee.id);

		},function(err){
			error("Get completed haircuts", err);
		});
		//get the services employee offers
		userService.getEmployeeServices($scope.employee.id, $scope.employee.store).then(function(response){
			if(response && response.length > 0){
				$scope.services = response;
			}else error("Has no services");

		}, function(err){
			errorjson('Services', err);
		});
	}

	$scope.schedule = function(){
		if($scope.employee.email == userService.currentUser.email){
			PopupService.showAlert('Error', "You can't schedule an Appointment with yourself");
			return;
		}
		$state.go('availability');
	}

	////////////GALLERY CODE//////////////
	$ionicModal.fromTemplateUrl('image-modal.html', {
		scope: $scope,
		animation: 'slide-in-right'
	}).then(function(modal) {
		$scope.modal = modal;
	});

	$scope.openModal = function() {$scope.modal.show();};
	$scope.closeModal = function() {$scope.modal.hide();};

	//Cleanup the modal when we're done with it!
	$scope.$on('$destroy', function() {$scope.modal.remove();});

    $scope.imgClick = function(cut) {
       	$scope.imageSrc = cut;
      	$scope.openModal();
    }
	//////////END GALLERY CODE///////////
})

.controller('availabilityCtrl', function($scope, $rootScope, userService, $ionicPopup, PopupService, $ionicHistory, $state, PushService, $ionicNativeTransitions) {
	$scope.days={}; //store the start and end time of each day to display in view
	var vacation;
	var response;

	$scope.data = {}
	$scope.data.minDate = new Date();
	$scope.data.maxDate = new Date();
	$scope.data.maxDate.setDate($scope.data.maxDate.getDate() + 90);

	var minTime = '';
	var maxTime = '';

	$scope.data.disableTime = false;
	$scope.data.displayTimeError = false;
	$scope.data.displayServiceError = false;

	$scope.services = []; //services employee offers

	function log(message){console.log("availabilityCtrl: "+message);}
	function error(message){console.error("availabilityCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	userService.loadUserDetails(false); //only important for development when this state is restarted in livereload

	getFreeTime();
	function getFreeTime(){
		var week;
		PopupService.showLoad();
		//get availability object
		userService.getHours($rootScope.selectedEmployee.id).then(function(result){
			PopupService.hideLoad();
			//log("hours:\n"+JSON.stringify(result, null, 2));
			if(result.data.data && result.data.data.length ==1){
				response = result.data.data[0];
				$scope.days.monday = convertHours(response.monday);
				$scope.days.tuesday = convertHours(response.tuesday);
				$scope.days.wednesday = convertHours(response.wednesday);
				$scope.days.thursday = convertHours(response.thursday);
				$scope.days.friday = convertHours(response.friday);
				$scope.days.saturday = convertHours(response.saturday);
				$scope.days.sunday = convertHours(response.sunday);
				$scope.vacation = convertHours(response.vacation, false, true);
				vacation = response.vacation;
			}else
				error("Barber has no hours");
		},function(err){
			errorjson('Get hours', err);
		});

		//get hours just for that date
		if($rootScope.req_date){
			log("date provided")
			$scope.dayNum = $rootScope.req_date.getDay();
		}else{// get hours for the week
			log("No date provided")
		}
	}

	getServices();
	function getServices(){
		userService.getEmployeeServices($rootScope.selectedEmployee.id, $rootScope.selectedEmployee.store).then(function(response){
			if(response.length > 0){
				$scope.services = response;
				log('# employee services: '+ $scope.services.length);
			}else{
				error('employee has no services');
			}
		}); //error handling is in the service
	}
	//check if employee is on vacation during the diven date
	function isOnVacay(date){
	    var req = new Date(date);
	    var start = new Date(vacation.substring(0,19));
	    var end   = new Date(vacation.substring(22));
	    //log('req ' + req);
	    //log('vstart ' + start);
	    //log('vend ' + end);
	    return (req >= start && req <= end);
	}

	function getDayString(d){ return ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d]; }

	//watch the date input so we can check if its during vacay or know the start and end times of that day
	$scope.$watch('data.date', function(newValue, oldValue) {
		if(!newValue) return;
		//log('new date: ' + newValue);
		if(newValue && isOnVacay(newValue)){
			log('on vacay');
			$scope.data.disableTime = true;
			return;
		}
		var hours = response[getDayString(new Date(newValue).getDay() )]; // 'response' var is the availability object; so find out the day of the selected date first
		hours = convertHours(hours, true); //convert string to "hh:mm:ss - hh:mm:ss"
		log("internal hours: "+hours);

		if(hours == "Not Available")
			$scope.data.disableTime = true;
		else{
			$scope.data.disableTime = false;
			minTime = new Date();
			maxTime = new Date();

			minTime.setHours(hours.substring(0,2), hours.substring(3,5)); 		//starting time
			maxTime.setHours(hours.substring(11,13), hours.substring(14,16));	//closing time

			log("min: "+minTime+"\nmax: "+maxTime);
		}
	});
	//watch time input to warn user if selected time is outside available time range
	$scope.$watch('data.time', function(newValue, oldValue) {
		if(!newValue) return;

		var target = new Date();
		target.setHours(newValue.getHours(), newValue.getMinutes());
		log("target: "+target);

		if(target < minTime || target > maxTime) $scope.data.displayTimeError = true;
		else $scope.data.displayTimeError = false;
	});
	//you can't select an invalid service, this is just to remove the service error if user tried to schedule without selecting one and then selects one
	$scope.$watch('data.selectService', function(newValue, oldValue) {
		if(newValue == oldValue) return;

		if(newValue) $scope.data.displayServiceError = false;
		else $scope.data.displayServiceError = true;
	});

	$scope.schedule = function() {

		var myPopup = $ionicPopup.show({
			template:
					'Date<input type="date" ng-model="data.date" min="{{data.minDate | date:\'yyyy-MM-dd\'}}" '+
					'max="{{data.maxDate | date:\'yyyy-MM-dd\'}}" required> '+
					'<span style="font-weight:bold" class="assertive" ng-if="data.disableTime">Not available that day</span> '+ //date error

					'<br> Time  <input type="time" ng-model="data.time" ng-disabled="data.disableTime || data.date==null"> '+
					'<span style="font-weight:bold" class="assertive" ng-if="data.displayTimeError">Not available that time</span> '+ //time error

					'<br> Service '+
					'<label class="item item-select"> '+
						'<select ng-model="data.selectService" ng-options="service as service.service for service in services" required></select>'+
					'</label>'+
					'<span style="font-weight:bold" class="assertive" ng-if="data.displayServiceError">Select a Service</span> ',	//service error

			title: 'Request Appointment',
			scope: $scope,
			buttons: [{
				text: 'Cancel'
			}, {
				text: '<b>Request</b>',
				type: 'button-energized',
				onTap: function(e) {
					if($scope.data.time){ 							//CHeck time
						if($scope.data.displayTimeError)
							e.preventDefault();
					}
					if (!$scope.data.date || !$scope.data.time) {	//Check Date
						e.preventDefault();
					}
					if($scope.data.selectService == undefined){ 	//Check Service
						$scope.data.displayServiceError = true;
						e.preventDefault();
					}
					return $scope.data;
				}
			}]
		});

		myPopup.then(function(res) {
			if (!res) return;

			res.date.setHours(res.time.getHours(), res.time.getMinutes());
			log("final time: " + res.date);
			makeAppointment(res.date, res.selectService);
		});
	};

	function makeAppointment(date, service){
		PopupService.showLoad();
		var haircut = { //haircut object
			time: date,
			user: userService.currentUser.id,
			store: $rootScope.selectedEmployee.store,
			employee: $rootScope.selectedEmployee.id,
			status: "pending",
			serviceName: service.service,
			servicePrice: service.price,
			serviceDuration: service.duration
		};
		userService.makeAppointment(haircut).then(function(response){
			PopupService.hideLoad();

			$scope.data.date = '';
			$scope.data.time = '';
			$scope.data.selectService = {};

			PushService.pushEmployee($rootScope.selectedEmployee.email, "New Appointment with "+userService.currentUser.firstName).then(function(res){
				log("Push Response\n"+JSON.stringify(res, null, 2));
			},function(err){
				error("Push Response\n"+JSON.stringify(err, null, 2));
			});

			gotoAppointment();

		},function(err){
			PopupService.hideLoad();
			errorjson('Make app', err);
			PopupService.showAlert('Error', "Unable to schedule you an appointment. Please check your network connection");
		});
	}

	function gotoAppointment(){
		log("going to appointment");
		$ionicHistory.nextViewOptions({
			disableAnimate: true,
			disableBack: false,
			historyRoot: true
		});
		$ionicNativeTransitions.stateGo('tabsController.appointment', {}, {reload: true}, {
		    type: 'slide',
        	direction: 'left',
        	fixedPixelsTop: 50
		    //"duration": 0,
		});
	}

	function convertVacay(vacation){
		if(!vacation || vacation == "none") return null;
	    var start = new Date(vacation.substring(0,19));
	    var end   = new Date(vacation.substring(23));
	    
	    var output = start.format("mmm dS, yyyy") + " - " +end.format("mmm dS, yyyy");
		return output;
	}

	function convertHours(dateString, internal, isVacay){
		if(!dateString || dateString.toLowerCase().trim()=="none") return "Not Available";

		var start = new Date(dateString.substring(0,19));
        var end = new Date(dateString.substring(22));

		if(internal)
			return start.format("HH:MM:ss") + " - " +end.format("HH:MM:ss");
		else if(isVacay)
			return start.format("m/dd/yy") + ' - '+ end.format("m/dd/yy");
		else
			return start.format("h:MM TT") + " - " +end.format("h:MM TT");
	}
})

.controller('appointmentCtrl', function($scope, userService, $state, $ionicHistory, $rootScope, PopupService, PushService, $ionicNativeTransitions) {
	$scope.cut = null;	//active haircut object (aka appointment)
  	$scope.rating = {rate: 0}; //this is for reviewing employee

	function log(message){console.log("appointmentCtrl: "+message);}
	function error(message){console.error("appointmentCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	checkForCut();
	function checkForCut(){
		PopupService.showLoad();
		userService.loadUserDetails(false).then(function(details) {
			if(!details) return true;

			userService.getUpcomingCut().then(function(response){
				PopupService.hideLoad();

				if(response.data.data && response.data.data.length==1){
                    var related = response.data.relatedObjects;
                    var data = response.data.data[0]; // [0] because the http request returns a list for this one (there should only ever be one max at any time though)

                    data.store = related.stores[data.store]; //get store object so we can show address
                    data.employee = related.employees[data.employee]; //employee object

                    $scope.cut = data;
					$scope.cut.localTime = new Date($scope.cut.time).format("dddd, mmm dS, yyyy, h:MM TT"); //utc to local, and format to pretty string
				}else{
					error('No upcoming cut');
					gotoRequest();
				}

			},function(err){
				error('Backend error\n'+JSON.stringify(err, null, 2));
				PopupService.showAlert('Error', 'Couldn\'t check for appointments. Please check network connection');
				gotoRequest();
			});
		});
	}

	$scope.cancelCut = function() {
		log("cancel button pressed");
		PopupService.showConfirm('Cancel Appointment', 'Are you sure you want to cancel? (10% fee if confirmed and within x hours)' )
		.then(function(res){
			if(!res) return

			//nothing to refund, cancel now
            if($scope.cut.charge_id.trim() == ""){
            	PopupService.showLoad();
                cancelCut();

            //customer was charged, do refund first
            }else{
            	var centsToRefund = null; //stays null if a full refund is to occur

            	var now = new Date();
            	var cutTime = new Date($scope.cut.time);
            	if(true){
            	//if(cutTime - now >= 0 && cutTime - now <= 3600000){
            		var amountInCents = parseInt($scope.cut.servicePrice.substring(1, $scope.cut.servicePrice.indexOf('.')) * 100 , 10)
                      + parseInt($scope.cut.servicePrice.substring( $scope.cut.servicePrice.indexOf('.') + 1 ), 10);
                    centsToRefund = 0.80 * parseInt(amountInCents, 10);
            		log('Partial refund: ' + centsToRefund);
            	}
            	PopupService.showLoad();
                userService.refundCut($scope.cut.id, centsToRefund).then(function(response){
                    log('Refunded Haircut');
                    $scope.cut.charge_id = ""; //we set the charge_id blank just in case cancelCut() fails and user has to try again. (re-refunding will return 417 error)
                    cancelCut();

                }, function(err){
                	PopupService.hideLoad();
                    errorjson("Refund",err);
                    PopupService.showAlert('Error', 'Unable to refund customer, Please try again');
                });
            }
		});
	};

	function cancelCut(){
		log('Cancelling cut');
		userService.cancelCut($scope.cut.id).then(function(response){
			PopupService.hideLoad();
			//send notification to employee
			PushService.pushEmployee($scope.cut.employee.email, userService.currentUser.firstName+ " cancelled an appointment").then(function(res) {
				log("Push Response\n"+JSON.stringify(res, null, 2));
			}, function(err){
				error("Push Response\n"+JSON.stringify(err, null, 2));
			});

			//Set global var so feed state knows to refresh since that state is cached (not sure if works)
			$rootScope.justCancelled = true;
			gotoRequest();

		}, function(err){
			PopupService.hideLoad();
			errorjson('Cancel Cut',err);
			PopupService.showAlert("Error", "Please check you network connection");
		});
	}

	$scope.checkIn = function() {
		var appTime = new Date($scope.cut.time);
		var rightNow = new Date();

		//can only check in if within 30 minutes of scheduled time, and confirmed (right now its set to is greater than or equal to 30 minutes, change to '<=' for prod)
		if(appTime - rightNow >= 1800000 && $scope.cut.status == 'confirmed') {
			userService.checkIn($scope.cut.id).then(function(response){
				log("Checked In");
				$scope.cut.checkedIn = new Date(); //value doesn't matter, just shouldn't be null anymore
				//tell employee user checked in
				PushService.pushEmployee($scope.cut.employee.email, userService.currentUser.firstName+ " has checked in").then(function(res) {
					log("Push Response\n"+JSON.stringify(res, null, 2));
				}, function(err){
					error("Push Response\n"+JSON.stringify(err, null, 2));
				});

			}, function(err){
				PopupService.showAlert("Error", "Failed to Check In. Please check your network connection");
				errorjson("Failed to Check In", err);
			});
		}else{
			PopupService.showAlert('Appointment', 'It\'s too early to check in.');
		}
	};

	//sets cut to never be shown in appointment review (and also sets the employeeReview)
	$scope.dismissCut = function() {
		PopupService.showLoad();

		//if stars were set for employee, run custom action in backend to adjust employee rating
		if($scope.cut.status.toLowerCase()=='completed' && $scope.rating.rate > 0){
			log('Sending Stars');
        	userService.adjustEmployeeRating($scope.cut.employee.id, $scope.rating.rate).then(function(response){
        		log('Adjusted Rating');
        	}, function(err){
        		errorjson('Adjust rating', err);
        	});
        }
        //also save the employee review, since this is also called after the haircut is completed
        userService.modifyCut($scope.cut.id, { dismissedByUser: true, employeeReview: $scope.cut.employeeReview}).then(function(response){
        	PopupService.hideLoad();
    		log('Dismissed Cut');
    		//Set global var so feed state know to refresh since that state is cached
			$rootScope.justCancelled = true;
			gotoRequest();

        }, function(err){
        	PopupService.hideLoad();
        	errorjson('Dismiss Failed:',err);
        });
    }

	$scope.openMaps = function() {
		var address = $scope.cut.store.address;
		var url = '';
		if (device.platform === 'iOS' || device.platform === 'iPhone' || navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
			url = "http://maps.apple.com/maps?q=" + encodeURIComponent(address);

		} else if (navigator.userAgent.match(/(Android|BlackBerry|IEMobile)/)) {
			url = "geo:?q=" + encodeURIComponent(address);

		} else {
			//this will be used for browsers if we ever want to convert to a website
			url = "http://maps.google.com?q=" + encodeURIComponent(address);
		}
		window.open(url, "_system", 'location=no');
    }

	function gotoRequest(){
		log("going to request");
		$ionicHistory.nextViewOptions({
			disableAnimate: true,
			disableBack: false,
			historyRoot: true
		});
		$ionicNativeTransitions.stateGo('tabsController.request', {}, {reload: true}, {
		    type: 'slide',
        	direction: 'left',
        	fixedPixelsTop: 50
		    //"duration": 0,
		});
	}
})

.controller('settingsCtrl', function($scope,LoginService, $state, $timeout, userService,$ionicHistory) {
	$scope.data = { 'distance' : ''	}; //since this is a string, it needs to be in a object, or else it doesn't update
	var timeoutId = null;

	function log(message){console.log("settingsCtrl: "+message);}
	function error(message){console.error("settingsCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	function getUserDetails() {
		userService.loadUserDetails(false).then(function(result) {
			if (!result) return;
			//set the distance setting
			$scope.data = { 'distance': userService.currentUser.searchRange };

			// watch search distance input
			$scope.$watch('data.distance', function(newValue, oldValue) {
				if (newValue == oldValue || newValue == null) return;
				if (timeoutId !== null) return;

				//log('Not going to ignore this one');
				timeoutId = $timeout(function() {
					$timeout.cancel(timeoutId);
					timeoutId = null;

					userService.updateUser({ searchRange: $scope.data.distance }).then(function(response) {
						log("saved distance successfully: " + $scope.data.distance);
						//update local copy
						userService.currentUser.searchRange = $scope.data.distance;
					}, function(err) {
						errorjson('Save search distance:', err);
					});

				}, 700); //do the update if no change within 700ms of last change
			});
		});
	};
	getUserDetails();

	$scope.logout = function() {
		log("logging out");

        log('Unsubscribing user to OneSignal');
        window.plugins.OneSignal.deleteTag("email");
        window.plugins.OneSignal.setSubscription(false);

        userService.wipeUserDetails();
		LoginService.signout().then(function () {
			log("logged out");
			$ionicHistory.clearCache().then(function() {
				log("Cleared Cache");
				$ionicHistory.nextViewOptions({
					disableBack: true,
					historyRoot: true
				});
				$state.go("login");
			});
		});
	}
})

.controller('promotionsCtrl', function($scope, userService, PopupService) {
	$scope.unusedCoupons = []; //coupon objects of currentuser; redeemed but unused
	var redeemedCodes = []; //just the codes of the coupons currentuser has redeemed(used and unused)
	$scope.data = {ready:false}; //we don't want to allow redemption of coupons when we don't know whats been redeemed
	$scope.data2 = {inputCode: ''}; //this is separate from the above object, so when we 'clear' the input (data2={}), we still know if we're ready or not

	function log(message){console.log("promotionsCtrl: "+message);}
	function error(message){console.error("promotionsCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {viewData.enableBack = true;});

	getUserDetails();
	function getUserDetails(){
		userService.loadUserDetails(false).then(function(result){
			if(!result) return;

			userService.getRedeemedCoupons().then(function(response){
				if(response.data.data){
					angular.forEach(response.data.data, function(data){
						redeemedCodes.push(data.code); //get codes of redemeed coupons, so we can make sure user can't redeem a code that was already redeemed

						if(data.status.toLowerCase() != 'used')
							$scope.unusedCoupons.push(data); //get unused coupons to display
					});
				}
				$scope.data.ready = true; //we are now ready to accept a coupon to redeem
				log('Redeemed coupons #: '+redeemedCodes.length);
				log('Unused coupon #: '+$scope.unusedCoupons.length);

			}, function(err){
				// if we get error, DONT allow adding of coupons since we don't know if they were already redeemed
				errorjson("Error getting redeemed coupons",err);
				PopupService.showAlert('Error', "Error occured. Please check your network connection");
				$scope.data.ready = false;
			});
		});
	};

	$scope.redeem = function(code){
		if(redeemedCodes.indexOf(code.toLowerCase()) > -1){ // check if already redeemed and if ready
			PopupService.showAlert('','You already redeemed this code');
			return;
		}
		// get the coupon object from backend
		userService.retrieveCoupon(code.toLowerCase()).then(function(response){
			if (response.data.data && response.data.data.length == 1) { 

			    var coupon = response.data.data[0];     
				coupon.user = userService.currentUser.id.toString(); //make current user the owner

				//it exists so add it to the user
				userService.addCoupon(coupon).then(function(result){
					redeemedCodes.push(code.toLowerCase()); //new code we won't allow to be redeemed 
					$scope.unusedCoupons.push(coupon); //add new coupon to list in view
					$scope.data2 = {}; //clear the input field (clearing just the string won't work)

				}, function(err){
					errorjson("Error adding coupon", err);
					PopupService.showAlert('Error','Unable to Redeem Code. Please check your network connection');
				});

			}else{
				PopupService.showAlert('Error','Code is invalid');
			}
		}, function(err){
			errorjson("Error retrieving coupon", err);
			PopupService.showAlert('Error','Unable to Redeem Code. Please check your network connection');
		});
	}
})

.controller('creditCardCtrl', function($scope, userService, StripeService, PopupService) {
	$scope.card = {}; //for adding card form
	$scope.data = {
		cards: [], //array but only allow one card at a time, might change in the future
		editCardMode: false //now if to show edit form or not
	};
	$scope.paymentForm = {}; //holds payment form input values
	$scope.addCardMode = false; //now if to show add card form or not

	function log(message){console.log("creditCardCtrl: "+message);}
	function error(message){console.error("creditCardCtrl: "+message);}
    function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	$scope.$on('$ionicView.beforeEnter', function (event, viewData) {viewData.enableBack = true;});

	getUserDetails();
	function getUserDetails(){
		userService.loadUserDetails(false).then(function(details) {
			if(userService.currentUser.cus_id) getCards();
			else $scope.addCardMode = true;
		});
	}

	function getCards(){		
		log("getting cards");
		StripeService.getCards(userService.currentUser.cus_id).then(function(response){

			$scope.data.cards = [];
			angular.forEach(response.data.data, function(data) {
				$scope.data.cards.push(data);
			});

  			log("# of cards: "+ $scope.data.cards.length);
  			if($scope.data.cards.length == 0) $scope.addCardMode = true; //show add card form, since there are no cards added
  			else $scope.addCardMode = false;

  		},function(err){
  			errorjson("Get Cards:",err);
  			PopupService.showAlert('Error', "Can't retrieve payment info. PLease check your network connection");
  		});
	}

	// delete card prompt
	$scope.deleteConfirm = function(card, index) {
		PopupService.showConfirm('Remove Card', 'Are you sure you want to remove ' + card.brand + ' - ' + card.last4 + '?' ).then(function(res){
			if (!res) return;
			PopupService.showLoad();

			StripeService.removeCard(userService.currentUser.cus_id, card.id).then(function(result) {
				PopupService.hideLoad();

				$scope.data.cards.splice(index, 1); //remove card from view
				if ($scope.data.cards.length < 1) {
					$scope.addCardMode = true; //now show add card form
				}
				
			}, function(err) {
				PopupService.hideLoad();
				errorjson("Remove Card:", err);
				PopupService.showAlert("Failed to remove", "");
			});
		});
	};

	$scope.addCard = function(card) {
		card.name = userService.currentUser.firstName + " " + userService.currentUser.lastName; //add a name field to the card object

		Stripe.card.createToken(card, function(status, response) {
			if (response.error) { // Problem!
				errorjson("token error: " + response);
				PopupService.showAlert("Card Error", "Please check your card fields");
				return null;

			} else { // Token was created!
				PopupService.showLoad();
				// Get the token ID:
				var token = response.id;

				//existing customer, new card object
				if (userService.currentUser.cus_id) {
					log("existing guy");

					StripeService.addCard(userService.currentUser.cus_id, token).then(function(response) {
						PopupService.hideLoad();

						$scope.card = {}; //clear add card form inputs
						$scope.addCardMode = false; //hide add card form
						$scope.data.cards.push(response.data); //show new card in view

					}, function(err) {
						PopupService.hideLoad();
						errorjson("Add Card:", err);
						PopupService.showAlert("Failed to add new card", err.error.message);
					});
				} else {
					//brand new customer, so create customer object in Stripe 
					log("new guy");

					StripeService.createCustomer(userService.currentUser.email, token).then(function(response) {
						PopupService.hideLoad();
						$scope.card = {};

						$scope.data.cards.push(response.data.sources.data[0]); //even if we allowed multiple cards, since this is a new cust, always get the first index
						//update user object with the stripe cus_id
						userService.updateUser({ cus_id: response.data.id }).then(function(result) {
							userService.currentUser.cus_id = response.data.id
							$scope.addCardMode = false;

							//customer created in Stripe but couldn't add it to backend user obj
						}, function(err) {
							errorjson("Update User:", err);
							PopupService.showAlert("Failed to add new card", "Please check you network connection");
						});

					}, function(err) {
						PopupService.hideLoad();
						errorjson("New customer:", err);
						PopupService.showAlert("Failed to add new card", err.error.message);
					});
				}
			}
		});
	}

	$scope.editCard = function(newInfo, card, index) {
		PopupService.showLoad();
		StripeService.updateCard(userService.currentUser.cus_id, card.id, newInfo).then(function(response) {
			PopupService.hideLoad();
			log('Updated card');
			//update local data
			$scope.data.cards = []; 				//replacing doesn't work/update the view, so clearing it first
			$scope.data.cards.push(response.data);

			$scope.data.editCardMode = false;
			//reset form inputs
			newInfo = {};

		}, function(err){
			PopupService.hideLoad();
			errorjson("Edit card", err);
			PopupService.showAlert("Failed to update card", "One or more of your fields are invalid");
		});
	}
})

.controller('signupCtrl', function(Backand, $state, $rootScope, LoginService, PopupService) {
	var vm = this;
	vm.signup = signUp;

	function log(message){console.log("signupCtrl: "+message);}
	function error(message){console.error("signupCtrl: "+message);}

	function signUp(){
		LoginService.signup(vm.firstName, vm.lastName, vm.email, vm.password, vm.again).then(function (response) {
            onLogin();
        }, function (reason) {
        	error(reason.data.error_description);
        	PopupService.showAlert("Error", reason.data.error_description);
        });
	}

	function onLogin() {
		$rootScope.$broadcast('authorized');
		$ionicHistory.clearHistory();

		if(Backand.getUsername() == null){
			Backand.getUserDetails(true).then(function(response){
				gotoFeed();
			});
		}else{
			gotoFeed();
		}
	}

	function gotoFeed(){
		log("logged in as: "+Backand.getUsername());

		log('Subscribing OneSignal account');
		window.plugins.OneSignal.sendTag("email", Backand.getUsername());
        window.plugins.OneSignal.setSubscription(true);

		$ionicHistory.clearCache().then(function () {
			$state.go('tabsController.feed');
		});
	}

	vm.email = '';
	vm.password ='';
	vm.again = '';
	vm.firstName = '';
	vm.lastName = '';
})

.controller('loginCtrl', function(Backand, $state, $rootScope, LoginService, PopupService, $ionicHistory) {
	var login = this;

	function log(message){console.log("loginCtrl: "+message);}
	function error(message){console.error("loginCtrl: "+message);}
	function json(message, obj){log(message+'\n'+JSON.stringify(obj, null, 2));}
    function errorjson(message, obj){error(message+'\n'+JSON.stringify(obj, null, 2));}

	function signin() {
		PopupService.showLoad();
		LoginService.signin(login.email, login.password)
		.then(function () {
			PopupService.hideLoad();
			login.email = "";
			login.password = "";
			onLogin();
		}, function (err) {
			PopupService.hideLoad();
			error("Normal Signin Error: "+ JSON.stringify(err, null, 2));
			login.error = err.error_description;
			PopupService.showAlert("Login Failed", login.error);
		});
	}

	function onLogin() {
		$rootScope.$broadcast('authorized');
		$ionicHistory.clearHistory();

		if(Backand.getUsername() == null){
			Backand.getUserDetails(true).then(function(response){
				gotoFeed();
			});
		}else{
			gotoFeed();
		}
	}

	function gotoFeed(){
		log("logged in as: "+Backand.getUsername());

		log('Subscribing OneSignal account');
		window.plugins.OneSignal.sendTag("email", Backand.getUsername());
        window.plugins.OneSignal.setSubscription(true);

		$ionicHistory.clearCache().then(function () {
			$state.go('tabsController.feed');
		});
	}

	function socialSignIn(provider) {
		LoginService.socialSignIn(provider)
		.then(onValidLogin, onErrorInLogin);
	}

	function socialSignUp(provider) {
		LoginService.socialSignUp(provider)
		.then(onLogin, onErrorInLogin);
	}
/*
	onValidLogin = function(response){
		onLogin();
		login.username = response.data || login.username;
	}
*/
	onErrorInLogin = function(rejection){
		error("Social signin Error: "+ JSON.stringify(rejection, null, 2));
		login.error = rejection.data;
		$rootScope.$broadcast('logout');
	}

	login.username = '';
	login.error = '';
	login.signin = signin;
	login.socialSignup = socialSignUp;
	login.socialSignin = socialSignIn;

})