import React, { Component } from 'react';
import styles from './app.scss';

export default class App extends Component {
  render() {
    return (
      <div className={styles.appContainer}>
        <h1> Hello, World!</h1>
      </div>
    );
  }
}
