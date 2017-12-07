angular.module('app.directives', [])

.directive('blankDirective', [function(){

}])

.directive('headerShrink1', function($document) {
  var fadeAmt;

  var shrink = function(header, content, amt, max, tab) {
    amt = Math.min(44, amt);
    fadeAmt = 1 - amt / 44;
    ionic.requestAnimationFrame(function() {
      header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
      for(var i = 0, j = header.children.length; i < j; i++) {
        header.children[i].style.opacity = fadeAmt;
        header.children[i].style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
      }
      tab.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
    });
  };

  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var starty = orgStarty = $scope.$eval($attr.headerShrink) || 40;
      var shrinkAmt;
      
      var header = $document[0].body.querySelector('.bar-header');
      var tab = $document[0].body.querySelector('div.tabs');

      var headerHeight = header.offsetHeight;
      console.log("title Height: "+ header.offsetHeight);
      
      $element.bind('scroll', function(e) { 
          shrinkAmt = headerHeight - (headerHeight - (e.target.scrollTop - starty));

          if (shrinkAmt >= headerHeight){
            //header is totaly hidden - start moving startY downward so that when scrolling up the header starts showing
            starty = (e.target.scrollTop - headerHeight);
            shrinkAmt = headerHeight;
          } else if (shrinkAmt < 0){
            //header is totaly displayed - start moving startY upwards so that when scrolling down the header starts shrinking
            starty = Math.max(orgStarty, e.target.scrollTop);
            shrinkAmt = 0;
          } 
          
          shrink(header, $element[0], shrinkAmt, headerHeight, tab); //do the shrinking   
        
      });
    }
  }
})

.directive('expandingTextarea', function () {
    return {
        restrict: 'A',
        controller: function ($scope, $element, $attrs, $timeout) {
            $element.css('min-height', '0');
            $element.css('resize', 'none');
            $element.css('overflow-y', 'hidden');
            setHeight(0);
            $timeout(setHeightToScrollHeight);

            function setHeight(height) {
                $element.css('height', height + 'px');
                $element.css('max-height', height + 'px');
            }

            function setHeightToScrollHeight() {
                setHeight(0);
                var scrollHeight = angular.element($element)[0]
                  .scrollHeight;
                if (scrollHeight !== undefined) {
                    setHeight(scrollHeight);
                }
            }

            $scope.$watch(function () {
                return angular.element($element)[0].value;
            }, setHeightToScrollHeight);
        }
    };
})

.directive('tabsSwipable', ['$ionicGesture', '$ionicNativeTransitions', function($ionicGesture, $ionicNativeTransitions){
    //
    // make ionTabs swipable. leftswipe -> nextTab, rightswipe -> prevTab
    // Usage: just add this as an attribute in the ionTabs tag
    // <ion-tabs tabs-swipable> ... </ion-tabs>
    //
    return {
        restrict: 'A',
        require: 'ionTabs',
        link: function(scope, elm, attrs, tabsCtrl){
            var tabs = ['/page1/page2','/page1/page3','/page1/page4']
            var onSwipeLeft = function(){
                var target = tabsCtrl.selectedIndex() + 1;
                if (target < tabsCtrl.tabs.length) {
                    scope.$apply(tabsCtrl.select(target));
                   /* console.log('target:' + tabs[target]);
                    $ionicNativeTransitions.locationUrl(tabs[target], {
                        "type": "slide",
                        "direction": "left",
                        "duration": 300, 
                        "fixedPixelsTop": 50
                    });*/
                }
            };
            var onSwipeRight = function(){
                var target = tabsCtrl.selectedIndex() - 1;
                if(target >= 0){
                    scope.$apply(tabsCtrl.select(target));
                    /*console.log('target:' + tabs[target]);
                    $ionicNativeTransitions.locationUrl(tabs[target], {
                        "type": "slide",
                        "direction": "right",
                        "duration": 300, 
                        "fixedPixelsTop": 50
                    });*/
                }
            };
            
            var swipeGesture = $ionicGesture.on('swipeleft', onSwipeLeft, elm).on('swiperight', onSwipeRight);
            scope.$on('$destroy', function() {
                $ionicGesture.off(swipeGesture, 'swipeleft', onSwipeLeft);
                $ionicGesture.off(swipeGesture, 'swiperight', onSwipeRight);
            });
        }
    };
}])
;