angular.module('vr.controllers', [])

.controller('StatesCtrl', function($scope) {
  $scope.states = window.STATES;
})

.controller('StateCtrl', ["$scope", "$stateParams", "$state",
function($scope, $stateParams, $state) {
  for(var i = 0; i < window.STATES.length; i++){
    if($stateParams.stateAbv === window.STATES[i].abv){
      $scope.state = window.STATES[i];
      break;
    }
  }
}]);

