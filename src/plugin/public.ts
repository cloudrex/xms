import {User} from "../models/user";
import App from "../core/app";

export default class PluginPublic {
    public getUser(): User | undefined {
        return Object.assign({}, App.store.state.user.me);
    }
}