define(function (require) {
  var _ = require('lodash');
  var inflection = require('inflection');
  var registry = require('../saved_object_registry');
  var rison = require('utils/rison');

  require('angular-ui-ace');
  require('angular-elastic');
  require('directives/confirm_click');

  require('../_sections').push({
    order: 3,
    name: 'objects',
    display: 'Objects',
    url: '#/settings/objects'
  });

  require('routes')
  .when('/settings/objects', {
    template: require('text!../partials/objects.html')
  })
  .when('/settings/objects/:service/:id', {
    template: require('text!../partials/objects_view.html')
  });

  require('modules').get('app/settings', ['ui.ace', 'monospaced.elastic'])
  .directive('kbnSettingsObjects', function (config, Notifier, Private) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState) {

        var $state = $scope.state = new AppState();

        var getData = function (filter) {
          var services = registry.all().map(function (obj) {
            var service = $injector.get(obj.service);
            return service.find(filter).then(function (data) {
              return { service: obj.service, title: obj.title, data: data };
            });
          });
          $q.all(services).then(function (data) {
            $scope.services =  _.sortBy(data, 'title');
            if (!$state.tab) {
              $scope.changeTab($scope.services[0]);
            }
          });
        };

        $scope.changeTab = function (obj) {
          $state.tab = obj.title;
          $state.commit();
        };

        $scope.$watch('advancedFilter', function (filter) {
          getData(filter);
        });

      }
    };
  })
  .directive('kbnSettingsObjectsView', function (config, Notifier) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $routeParams, $location, $window) {

        var serviceObj = registry.get($routeParams.service);
        var service = $injector.get(serviceObj.service);

        var createField = function (memo, val, key, collection, parents) {
          if (_.isArray(parents))  {
            parents.push(key);
          } else {
            parents = [key];
          }

          var field = { type: 'text', name: parents.join('.'), value: val };

          if (_.isString(field.value)) {
            try {
              field.value = JSON.stringify(JSON.parse(field.value), null, '  ');
              field.type = 'json';
            } catch (err) {
              field.value = field.value;
            }
          } else if (_.isNumeric(field.value)) {
            field.type = 'number';
          } else if (_.isArray(field.value)) {
            field.type = 'array';
            field.value = JSON.stringify(field.value, null, ' ');
          } else if (_.isPlainObject(field.value)) {
            // do something recursive 
            return _.reduce(field.value, _.partialRight(createField, parents), memo);
          } else {
            return;
          }

          memo.push(field);
          
          // once the field is added to the object you need to pop the parents
          // to remove it since we've hit the end of the branch.
          parents.pop();
          return memo;
        };
        
        $scope.title = inflection.singularize(serviceObj.title);

        service.get($routeParams.id).then(function (obj) {
          $scope.obj = obj;
          $scope.link = service.urlFor(obj.id);
          $scope.fields = _.reduce(obj._source, createField, []);
        });

        // This handles the validation of the Ace Editor. Since we don't have any
        // other hooks into the editors to tell us if the content is valid or not
        // we need to use the annotations to see if they have any errors. If they
        // do then we push the field.name to aceInvalidEditor variable. 
        // Otherwise we remove it.
        $scope.aceInvalidEditors = [];
        $scope.aceLoaded = function (editor) {
          var session = editor.getSession();
          var fieldName = editor.container.id;
          // For some reason the editor is initialized with {{field.name}} as the ID
          // then it's re-initalized a second time with the proper id. We need to 
          // return from the function if we do not get the proper fieldName.
          if (fieldName === '{{field.name}}') return;
          session.on('changeAnnotation', function () {
            var annotations = session.getAnnotations();
            if (_.some(annotations, { type: 'error'})) {
              if (!_.contains($scope.aceInvalidEditors, fieldName)) {
                $scope.aceInvalidEditors.push(fieldName)
              }
            } else {
              $scope.aceInvalidEditors = _.without($scope.aceInvalidEditors, fieldName)
            }
          });
        };

        $scope.delete = function () {
          $scope.obj.delete().then(function (resp) {
            $location.path('/settings/objects').search({ _a: rison.encode({
              tab: serviceObj.title
            })});
            var notify = new Notifier();
            notify.info('You successfully deleted the "' + $scope.obj.title + '" ' + $scope.title.toLowerCase() + ' object');
          });
        };

        $scope.submit = function () {
          var source = _.cloneDeep($scope.obj._source);
          var value;

          _.each($scope.fields, function (field) {
            switch (field.type) {
              case 'number':
                value = Number(field.value);
                break;
              case 'array':
                value = JSON.parse(field.value);
                break;
              default:
                value = field.value;
            }
            _.setValue(source, field.name, field.value);
          });

          $scope.obj.saveSource(source).then(function (resp) {
            $location.path('/settings/objects').search({ _a: rison.encode({
              tab: serviceObj.title
            })});
            var notify = new Notifier();
            notify.info('You successfully updated the "' + $scope.obj.title + '" ' + $scope.title.toLowerCase() + ' object');
          });
        };

      }
    };
  });
  
});