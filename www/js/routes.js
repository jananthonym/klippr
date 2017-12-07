angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    
  

    .state('tabsController.feed', {
    url: '/page2',
    views: {
      'tab1': {
        templateUrl: 'templates/feed.html',
        controller: 'feedCtrl'
      }
    }
  })

  .state('tabsController.request', {
    url: '/page3',
    views: {
      'tab2': {
        templateUrl: 'templates/request.html',
        controller: 'requestCtrl'
      }
    }
  })

  .state('tabsController.settings', {
    url: '/page4',
    views: {
      'tab3': {
        templateUrl: 'templates/settings.html',
        controller: 'settingsCtrl'
      }
    }
  })

  .state('tabsController', {
    url: '/page1',
    templateUrl: 'templates/tabsController.html',
    abstract:true
  })

  .state('login', {
    url: '/page5',
    templateUrl: 'templates/login.html',
    controller: 'loginCtrl as login'
  })

  .state('signup', {
    url: '/page6',
    templateUrl: 'templates/signup.html',
    controller: 'signupCtrl as vm'
  })

  .state('storePage', {
    cache: false,
    url: '/page7',
    templateUrl: 'templates/storePage.html',
    controller: 'storePageCtrl'
  })

  .state('employeesPage', {
    cache: false,
    url: '/page8',
    templateUrl: 'templates/employeesPage.html',
    controller: 'employeesPageCtrl'
  })

  .state('availability', {
    url: '/page9',
    templateUrl: 'templates/availability.html',
    controller: 'availabilityCtrl'
  })

  .state('tabsController.appointment', {
    cache: false,
    url: '/page10',
    views: {
      'tab2': {
        templateUrl: 'templates/appointment.html',
        controller: 'appointmentCtrl'
      }
    }
  })

  .state('creditCard', {
    cache: false,
    url: '/page11',
    templateUrl: 'templates/creditCard.html',
    controller: 'creditCardCtrl'
  })

  .state('haircut', {
    cache: false,
    url: '/page12',
    templateUrl: 'templates/haircut.html',
    controller: 'haircutCtrl'

  })

  .state('search', {
    url: '/page13',
    templateUrl: 'templates/search.html',
    controller: 'searchCtrl'
  })

  .state('profileView', {
    cache: false,
    url: '/page14',
    templateUrl: 'templates/profileView.html',
    controller: 'profileViewCtrl'
  })

  .state('promotions', {
    cache: false,
    url: '/page15',
    templateUrl: 'templates/promotions.html',
    controller: 'promotionsCtrl'

  })

$urlRouterProvider.otherwise('/page1/page2')

  

});