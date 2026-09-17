import { createBrowserHistory } from 'history';

const browserHistory = createBrowserHistory();

export const history = Object.assign(browserHistory, {
  goBack() {
    browserHistory.back();
  },
});
