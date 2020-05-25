import App from "./core/app";
import "./styles/global.scss";
import Config, {IConfig} from "./core/config";
import {Provider} from "react-redux";
import React from "react";
import {HashRouter, Switch, Route} from "react-router-dom";
import ErrorPage from "./components/pages/error";
import AuthPage from "./components/pages/auth";
import Application from "./components/application";
import {User} from "./models/user";
import DefaultPage from "./components/pages/default";
import AppStore, {createInitialState, IAppState} from "./store/store";

// Prepare config.
const config: IConfig = Config.loadOrCreate();

// Create the local user object.
const me: User = {
    id: config.id,
    state: config.state,
    createdTime: config.createdTime,
    username: config.username,
    status: config.status
};

// Create the initial state before anything else.
export const initialState: IAppState = createInitialState(me);

// Create the initial store.
export const store: AppStore = AppStore.createDefault();

// Create the app global. This will also boot the application.
export const app: App = new App(() => (
    <Provider store={store.unwrap()}>
        <HashRouter>
            <Switch>
                {/* TODO: Hard-coded prop as null (required to pass in). */}
                <Route path="/" exact render={() =>
                    <Application modals={[]}>
                        <DefaultPage />
                    </Application>
                } />
                <Route path="/" exact component={AuthPage} />
                <Route component={ErrorPage} />
            </Switch>
        </HashRouter>
    </Provider>
));
