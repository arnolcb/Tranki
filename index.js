// index.js
import 'react-native-gesture-handler'; // DEBE SER LA PRIMERA LÍNEA
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);