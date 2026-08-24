import React, { FC, useEffect, useLayoutEffect } from 'react';
import classnames from 'classnames';
import { useHistory, useLocation, Route } from 'react-router-dom';
import { RootPathContext, useDispatch } from '@frontegg/react-core';
import { ConnectivityContentProps } from '../components/ConnectivityContent';
import { TPlatform } from '../interfaces';
import { platformForm } from '../consts';
import { useConnectivityActions } from '@frontegg/react-hooks';

export interface IMakeComponent {
  type: TPlatform;
  defaultPath: string;
}

export const makeComponent = ({ type, defaultPath }: IMakeComponent): FC<ConnectivityContentProps> => ({
  rootPath = defaultPath,
  className,
}) => {
  const { loadDataAction, initData } = useConnectivityActions();
  const dispatch = useDispatch();
  const history = useHistory();
  const { state } = useLocation();

  // Read the location inside the effect rather than capturing it at render: under
  // React 18 the effect can run after a navigation, and replacing with the captured
  // location silently undoes it.
  useEffect(() => {
    const { state: currentState, ...currentLocation } = history.location;
    !currentState && history.replace({ ...currentLocation, state: {} });
  }, [history, state]);

  useLayoutEffect(() => {
    loadDataAction([type]);
    return () => {
      initData();
    };
  }, [dispatch]);

  const Component = platformForm[type];
  return (
    <RootPathContext.Provider value={rootPath}>
      <div className={classnames('fe-connectivity-component', className)}>
        <Route exact path={`${rootPath}`} component={Component} />
      </div>
    </RootPathContext.Provider>
  );
};
