// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('app', ['ionic','backand', 'ngCordova','ionic-native-transitions', 'ionic.rating', 'app.controllers', 'app.routes', 'app.services', 'app.directives'])

.config(function (BackandProvider, $httpProvider, $ionicConfigProvider, $ionicNativeTransitionsProvider) {
    BackandProvider.setAppName('klippr');
    BackandProvider.setSignUpToken('4c9d2dec-ad62-4ddc-9bf6-85446e8e6d8f');
    BackandProvider.setAnonymousToken('76f6b9ae-2844-4cd6-9e16-a7885e3e4354');
    BackandProvider.manageRefreshToken(true);

    $httpProvider.interceptors.push('APIInterceptor');

    Stripe.setPublishableKey('pk_test_OJNULItRzmcNYhJzWvaE6I7b');

    $ionicConfigProvider.tabs.position('top');

    $ionicNativeTransitionsProvider.setDefaultOptions({
        duration: 190, // in milliseconds (ms), default 400,
        slowdownfactor: 4, // overlap views (higher number is more) or no overlap (1), default 4
        iosdelay: -1, // ms to wait for the iOS webview to update before animation kicks in, default -1
        androiddelay: -1, // same as above but for Android, default -1
        winphonedelay: -1, // same as above but for Windows Phone, default -1,
        fixedPixelsTop: 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
        fixedPixelsBottom: 0, // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
        triggerTransitionEvent: '$ionicView.afterEnter', // internal ionic-native-transitions option
        backInOppositeDirection: false // Takes over default back transition and state back transition to use the opposite direction transition to go back
    });
    $ionicNativeTransitionsProvider.setDefaultTransition({
        type: 'fade'
    });
    $ionicNativeTransitionsProvider.setDefaultBackTransition({
        type: 'fade'
    });

})

.run(function($ionicPlatform, $rootScope, $state, LoginService, Backand, $ionicHistory, $ionicPopup) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }

        var isMobile = !(ionic.Platform.platforms[0] == "browser");
        Backand.setIsMobile(isMobile);
        Backand.setRunSignupAfterErrorInSigninSocial(true);

        // Enable to debug issues.
        // window.plugins.OneSignal.setLogLevel({logLevel: 4, visualLevel: 4});

        var notificationOpenedCallback = function(jsonData) {
            console.log('didReceiveRemoteNotificationCallBack: ' + JSON.stringify(jsonData, null, 2));
            if (jsonData.isAppInFocus) {
                showAlert('Notification', jsonData.payload.body);
            }
            if(jsonData.payload.additionalData.targetState && jsonData.payload.additionalData.targetState.trim()!=''){
                $ionicHistory.nextViewOptions({
                    historyRoot: true
                });
                $state.go(jsonData.payload.additionalData.targetState, {}, {
                    reload: true
                });
            }else console.error("No Target State from notification");
        };

        window.plugins.OneSignal
            .startInit("331246bc-0327-497c-8374-27f31b5b09b5", "500566897008")
            .handleNotificationReceived(notificationOpenedCallback)
            .inFocusDisplaying(window.plugins.OneSignal.OSInFocusDisplayOption.None)
            .endInit();

        console.log('Subscribing user to OneSignal');
        window.plugins.OneSignal.setSubscription(true);
        if(Backand.getUsername()) window.plugins.OneSignal.sendTag("email", Backand.getUsername());

        function showAlert(title, text) {
            var alertPopup = $ionicPopup.alert({
                title: title,
                template: '<span style="margin:auto;" >'+text+'<span>',
                okType: 'button-energized'
            });
            alertPopup.then(function(res) {
            });
        };

    });

    function unauthorized() {
        console.log("user is unauthorized, sending to login");
        $ionicHistory.nextViewOptions({
            disableAnimate: true,
            disableBack: true,
            historyRoot: true
        });
        $state.go('login');
    }

    function signout() {
        LoginService.signout();
    }

    $rootScope.$on('unauthorized', function () {
        unauthorized();
    });  

    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        if (toState.name != 'login' && toState.name != 'signup' && Backand.getToken() == undefined) {

            if(Backand.getUsername() == null)
                Backand.getUserDetails().then(function(response){
                    if(Backand.getUsername() == null){
                        unauthorized()
                    }
                });
        }
    });

})
