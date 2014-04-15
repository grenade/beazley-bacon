var tt = window.tt || {};
tt.app = angular.module('beazley-bacon', ['ngRoute']);
tt.apiUrl = 'http://git.bfl.local/api/v3'
tt.apiToken = '4ec3ce768214caeb13b22037339a6f297dddf93e'
tt.appRepo = 'bacon/bacon.git.bfl.local'

tt.app.config(function ($routeProvider) {
    $routeProvider
        .when('/orders', {
            controller: 'ordersController',
            templateUrl: 'orders.html',
            activeRoute: 'orders'
        })
        .when('/order/:initials', {
            controller: 'orderController',
            templateUrl: 'order.html',
            activeRoute: 'orders'
        })
        .otherwise({ redirectTo: '/orders' });
});

tt.app.run(function($http) {
  $http.defaults.headers.common.Authorization = 'token ' + tt.apiToken
});

tt.app.controller('navController', navController);
tt.app.controller('orderController', orderController);
tt.app.controller('ordersController', ordersController);

function navController($scope, $route) {
    $scope.isActive = function(route) {
        return route && $route && $route.current && route === $route.current.activeRoute;
    };
}
function ordersController($scope, $http){
    $scope.load = function () {
        var url = tt.apiUrl + '/repos/' + tt.appRepo + '/contents/data/orders.json';
        $http({ method: 'GET', url: url }).success(function (data) {
            var orders = JSON.parse(window.atob(data.content));
            orders.sort(function(a, b) {
                var x = a.runs[a.runs.length - 1].date;
                var y = b.runs[b.runs.length - 1].date;
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
            $scope.orders = orders;
        });
    };
    $scope.load();
}
function orderController($scope, $http, $routeParams, $location){
    $scope.load = function () {
        var url = tt.apiUrl + '/repos/' + tt.appRepo + '/contents/data/orders.json';
        $http({ method: 'GET', url: url }).success(function (data) {
            var orders = JSON.parse(window.atob(data.content));
            var exists = false;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].initials == $routeParams.initials) {
                    exists = true;
                    $scope.order = orders[i];
                    break;
                }
            }
            if(!exists){
                $scope.order = {
                    name: '',
                    email: '',
                    initials: '',
                    bread: 'granary',
                    toasted: true,
                    sauce: 'brown',
                    filling: ['bacon'],
                    runs: [],
                    newrun: ''
                };
            }
        });
    };

    $scope.selectFilling = function selectFilling(filling) {
        var idx = $scope.order.filling.indexOf(filling);
        if (idx > -1) { // is currently selected
          $scope.order.filling.splice(idx, 1);
        }
        else { // is newly selected
          $scope.order.filling.push(filling);
        }
    };


    $scope.update = function(order) {
        var url = tt.apiUrl + '/repos/' + tt.appRepo + '/contents/data/orders.json';
        $http({ method: 'GET', url: url }).success(function (data) {
            var orders = JSON.parse(window.atob(data.content));
            var lastSha = data.sha;
            if (order.newrun.match($scope.DATE_REGEXP) && (order.runs.indexOf({date:order.newrun}) < 0)) {
                order.runs.push({date:order.newrun});
                order.runs.sort();
                order.newrun = '';
            }
            var preexists = false;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].initials == order.initials) {
                    preexists = true;
                    orders[i] = order;
                    break;
                }
            }
            if (!preexists) {
                orders.push(order);
            }
            var putData = {
                message: 'new order preferences for ' + order.name,
                committer: {
                    name: order.name,
                    email: order.email
                },
                content: window.btoa(JSON.stringify(orders, null, 2)),
                branch: 'master',
                sha: lastSha
            };
            $http.put(url, putData)
            .success(function () {
                console.log('updated orders succeeded');
                $location.path( "/orders" );
            })
            .error(function(data, status) {
                console.log('updated orders failed');
            });
        });
    };
    $scope.delete = function(order) {
        var url = tt.apiUrl + '/repos/' + tt.appRepo + '/contents/data/orders.json';
        $http({ method: 'GET', url: url }).success(function (data) {
            var orders = JSON.parse(window.atob(data.content));
            var lastSha = data.sha;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].initials == order.initials) {
                    orders.splice(i, 1)
                    break;
                }
            }
            var putData = {
                message: 'order for ' + order.initials + ' deleted',
                committer: {
                    name: order.name,
                    email: order.email
                },
                content: window.btoa(JSON.stringify(orders, null, 2)),
                branch: 'master',
                sha: lastSha
            };
            $http.put(url, putData)
            .success(function () {
                console.log('updated orders succeeded');
                $location.path( "/orders" );
            })
            .error(function(data, status) {
                console.log('updated orders failed');
            });
            $location.path( "/orders" );

        });
    };
    $scope.load();
    $scope.EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@beazley.com$/i;
    $scope.INITIALS_REGEXP = /^[a-zAZ0-9]{2,3}$/i;
    $scope.NAME_REGEXP = /^[a-zAZ0-9 ]{2,30}$/i;
    $scope.DATE_REGEXP = /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/;
}