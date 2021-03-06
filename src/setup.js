'use strict';

const mockReactNative = require('./index');

jest
.mock('ReactNativeDefaultInjection')
  .mock('Image', () => mockReactNative.mockComponent('Image'))
  .mock('Text', () => mockReactNative.mockComponent('Text'))
  .mock('TextInput', () => mockReactNative.mockComponent('TextInput'))
  .mock('Modal', () => mockReactNative.mockComponent('Modal'))
  .mock('View', () => mockReactNative.mockComponent('View'))
  .mock('ScrollView', () => mockReactNative.mockComponent('ScrollView'))
  .mock(
    'ActivityIndicator',
    () => mockReactNative.mockComponent('ActivityIndicator')
  )
  .mock('ListView', () => {
    const RealListView = require.requireActual('ListView');
    const ListView = mockReactNative.mockComponent('ListView');
    ListView.prototype.render = RealListView.prototype.render;
    return ListView;
  })
  .mock('ListViewDataSource', () => {
    const DataSource = require.requireActual('ListViewDataSource');
    DataSource.prototype.toJSON = function() {
      function ListViewDataSource(dataBlob) {
        this.items = 0;
        // Ensure this doesn't throw.
        try {
          Object.keys(dataBlob).forEach(key => {
            this.items += dataBlob[key] && dataBlob[key].length;
          });
        } catch (e) {
          this.items = 'unknown';
        }
      }

      return new ListViewDataSource(this._dataBlob);
    };
    return DataSource;
  })
  .mock('ensureComponentIsNative', () => () => true);

global.__DEV__ = true;
global.__fbBatchedBridgeConfig = require('./bridgeMock');

const {Response, Request, Headers, fetch} = require('whatwg-fetch');
global.Response = Response;
global.Request = Request;
global.Headers = Headers;
global.fetch = fetch;

require(
  'react-native/packager/src/Resolver/polyfills/Object.es7'
);
require(
  'react-native/packager/src/Resolver/polyfills/error-guard'
);

const mockNativeModules = require('NativeModules');
const mockEmptyObject = {};
const mockImageLoader = {
  configurable: true,
  enumerable: true,
  get: () => ({
    prefetchImage: jest.fn(),
    getSize: jest.fn(
      (uri, success) => process.nextTick(() => success(320, 240))
    )
  })
};
Object.defineProperty(mockNativeModules, 'ImageLoader', mockImageLoader);
Object.defineProperty(mockNativeModules, 'ImageViewManager', mockImageLoader);

const exponentModules = require('./exponentModules');
exponentModules.forEach(module => {
  const moduleName = Object.keys(module)[0];
  const moduleProperties = module[moduleName];
  const mockedProperties = {};

  moduleProperties.forEach(property => {
    const propertyName = Object.keys(property)[0];
    const propertyType = property[propertyName];

    let mockValue;
    if (propertyType === 'function') {
      mockValue = jest.fn();
    } else {
      mockValue = jest.mock();
    }

    mockedProperties[propertyName] = mockValue;
  });

  Object.defineProperty(mockNativeModules, moduleName, {
    enumerable: true,
    get: () => mockedProperties,
  });
});

jest.
  doMock('NativeModules', () => mockNativeModules).
  doMock('ReactNativePropRegistry', () => ({
    register: id => id,
    getByID: () => mockEmptyObject,
  })).
  doMock('requireNativeComponent', () => {
    const React = require('react');

    return (viewName, ...rest) => {
      return (props) => {
        return React.createElement(
          viewName,
          props,
          props.children
        );
      }
    }
  });
