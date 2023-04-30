import React, { useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import {
  Router,
  Route,
  Redirect,
  Switch,
  useLocation,
  NavLink,
} from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

import { createBrowserHistory } from 'history';
import hotkeys from 'hotkeys-js';

import * as actions from 'loot-core/src/client/actions';
import { AccountsProvider } from 'loot-core/src/client/data-hooks/accounts';
import { PayeesProvider } from 'loot-core/src/client/data-hooks/payees';
import { SpreadsheetProvider } from 'loot-core/src/client/SpreadsheetProvider';
import checkForUpdateNotification from 'loot-core/src/client/update-notification';
import checkForUpgradeNotifications from 'loot-core/src/client/upgrade-notifications';
import * as undo from 'loot-core/src/platform/client/undo';

import Cog from '../icons/v1/Cog';
import PiggyBank from '../icons/v1/PiggyBank';
import Wallet from '../icons/v1/Wallet';
import { useResponsive } from '../ResponsiveProvider';
import { colors, styles } from '../style';
import { getLocationState, makeLocationState } from '../util/location-state';
import { getIsOutdated, getLatestVersion } from '../util/versions';

import Account from './accounts/Account';
import MobileAccount from './accounts/MobileAccount';
import MobileAccounts from './accounts/MobileAccounts';
import { ActiveLocationProvider } from './ActiveLocation';
import BankSyncStatus from './BankSyncStatus';
import Budget from './budget';
import { BudgetMonthCountProvider } from './budget/BudgetMonthCountContext';
import MobileBudget from './budget/MobileBudget';
import { View } from './common';
import FloatableSidebar, { SidebarProvider } from './FloatableSidebar';
import GlobalKeys from './GlobalKeys';
import { ManageRulesPage } from './ManageRulesPage';
import Modals from './Modals';
import NordigenLink from './nordigen/NordigenLink';
import Notifications from './Notifications';
import { PageTypeProvider } from './Page';
import { ManagePayeesPage } from './payees/ManagePayeesPage';
import Reports from './reports';
import Schedules from './schedules';
import DiscoverSchedules from './schedules/DiscoverSchedules';
import EditSchedule from './schedules/EditSchedule';
import LinkSchedule from './schedules/LinkSchedule';
import PostsOfflineNotification from './schedules/PostsOfflineNotification';
import Settings from './settings';
import Titlebar, { TitlebarProvider } from './Titlebar';

function PageRoute({
  path,
  component: Component,
  redirectTo = '/budget',
  worksInNarrow = true,
}) {
  const { isNarrowWidth } = useResponsive();
  return worksInNarrow || !isNarrowWidth ? (
    <Route
      path={path}
      children={props => {
        return (
          <View
            style={{
              flex: 1,
              display: props.match ? 'flex' : 'none',
            }}
          >
            <Component {...props} />
          </View>
        );
      }}
    />
  ) : (
    <Redirect to={redirectTo} />
  );
}

// For routes that do not work well in narrow view
function NonPageRoute({
  redirectTo = '/budget',
  worksInNarrow = true,
  ...routeProps
}) {
  const { isNarrowWidth } = useResponsive();

  return worksInNarrow || !isNarrowWidth ? (
    <Route {...routeProps} />
  ) : (
    <Redirect to={redirectTo} />
  );
}

function Routes({ location }) {
  const { isNarrowWidth } = useResponsive();
  return (
    <Switch location={location}>
      <Redirect from="/" exact to="/budget" />

      <PageRoute path="/reports" component={Reports} worksInNarrow={false} />

      <PageRoute
        path="/budget"
        component={isNarrowWidth ? MobileBudget : Budget}
      />

      <NonPageRoute
        path="/schedules"
        exact
        component={Schedules}
        worksInNarrow={false}
      />
      <NonPageRoute
        path="/schedule/edit"
        exact
        component={EditSchedule}
        worksInNarrow={false}
      />
      <NonPageRoute
        path="/schedule/edit/:id"
        component={EditSchedule}
        worksInNarrow={false}
      />
      <NonPageRoute
        path="/schedule/link"
        component={LinkSchedule}
        worksInNarrow={false}
      />
      <NonPageRoute
        path="/schedule/discover"
        component={DiscoverSchedules}
        worksInNarrow={false}
      />
      <NonPageRoute
        path="/schedule/posts-offline-notification"
        component={PostsOfflineNotification}
      />

      <NonPageRoute path="/payees" exact component={ManagePayeesPage} />
      <NonPageRoute path="/rules" exact component={ManageRulesPage} />
      <NonPageRoute path="/settings" component={Settings} />
      <NonPageRoute
        path="/nordigen/link"
        exact
        component={NordigenLink}
        worksInNarrow={false}
      />

      <NonPageRoute
        path="/accounts/:id"
        exact
        children={props => {
          const AcctCmp = isNarrowWidth ? MobileAccount : Account;
          return (
            props.match && <AcctCmp key={props.match.params.id} {...props} />
          );
        }}
      />
      <NonPageRoute
        path="/accounts"
        exact
        component={isNarrowWidth ? MobileAccounts : Account}
      />
    </Switch>
  );
}

function StackedRoutes() {
  let location = useLocation();
  let locationPtr = getLocationState(location, 'locationPtr');

  let locations = [location];
  while (locationPtr) {
    locations.unshift(locationPtr);
    locationPtr = getLocationState(locationPtr, 'locationPtr');
  }

  let base = locations[0];
  let stack = locations.slice(1);

  return (
    <ActiveLocationProvider location={locations[locations.length - 1]}>
      <Routes location={base} />
      {stack.map((location, idx) => (
        <PageTypeProvider
          key={location.key}
          type="modal"
          current={idx === stack.length - 1}
        >
          <Routes location={location} />
        </PageTypeProvider>
      ))}
    </ActiveLocationProvider>
  );
}

function NavTab({ icon: TabIcon, name, path }) {
  return (
    <NavLink
      to={path}
      style={{
        alignItems: 'center',
        color: '#8E8E8F',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
      }}
      activeStyle={{ color: colors.p5 }}
    >
      <TabIcon
        width={22}
        height={22}
        style={{ color: 'inherit', marginBottom: '5px' }}
      />
      {name}
    </NavLink>
  );
}

function MobileNavTabs() {
  const { atLeastSmallWidth } = useResponsive();
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderTop: `1px solid ${colors.n10}`,
        bottom: 0,
        ...styles.shadow,
        display: atLeastSmallWidth ? 'none' : 'flex',
        height: '80px',
        justifyContent: 'space-around',
        paddingTop: 10,
        width: '100%',
      }}
    >
      <NavTab name="Budget" path="/budget" icon={Wallet} />
      <NavTab name="Accounts" path="/accounts" icon={PiggyBank} />
      <NavTab name="Settings" path="/settings" icon={Cog} />
    </div>
  );
}

const patchedHistory = createBrowserHistory();

function FinancesApp(props) {
  const { atLeastSmallWidth } = useResponsive();

  useEffect(() => {
    let oldPush = patchedHistory.push;
    patchedHistory.push = (to, state) => {
      let newState = makeLocationState(to.state || state);
      if (typeof to === 'object') {
        return oldPush.call(patchedHistory, { ...to, state: newState });
      } else {
        return oldPush.call(patchedHistory, to, newState);
      }
    };

    // I'm not sure if this is the best approach but we need this to
    // globally. We could instead move various workflows inside global
    // React components, but that's for another day.
    window.__history = patchedHistory;

    undo.setUndoState('url', window.location.href);

    const cleanup = patchedHistory.listen(location => {
      undo.setUndoState('url', window.location.href);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // TODO: quick hack fix for showing the demo
    if (patchedHistory.location.pathname === '/subscribe') {
      patchedHistory.push('/');
    }

    // Get the accounts and check if any exist. If there are no
    // accounts, we want to redirect the user to the All Accounts
    // screen which will prompt them to add an account
    props.getAccounts().then(accounts => {
      if (accounts.length === 0) {
        patchedHistory.push('/accounts');
      }
    });

    // The default key handler scope
    hotkeys.setScope('app');

    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await props.sync();

      // Check for upgrade notifications. We do this after syncing
      // because these states are synced across devices, so they will
      // only see it once for this file
      checkForUpgradeNotifications(
        props.addNotification,
        props.resetSync,
        patchedHistory,
      );
    }, 100);
  }, []);

  setTimeout(async () => {
    await props.sync();
    await checkForUpdateNotification(
      props.addNotification,
      getIsOutdated,
      getLatestVersion,
      props.loadPrefs,
      props.savePrefs,
    );
  }, 100);

  return (
    <Router history={patchedHistory}>
      <CompatRouter>
        <View style={{ height: '100%', backgroundColor: colors.n10 }}>
          <GlobalKeys />

          <View style={{ flexDirection: 'row', flex: 1 }}>
            {atLeastSmallWidth && <FloatableSidebar />}

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
              }}
            >
              {atLeastSmallWidth && (
                <Titlebar
                  style={{
                    WebkitAppRegion: 'drag',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                  }}
                />
              )}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  overflow: 'auto',
                  position: 'relative',
                }}
              >
                <Notifications />
                <BankSyncStatus />
                <StackedRoutes />
                {/*window.Actual.IS_DEV && <Debugger />*/}
                <Modals history={patchedHistory} />
              </div>

              <Switch>
                <Route path="/budget" component={MobileNavTabs} />
                <Route path="/accounts" component={MobileNavTabs} />
                <Route path="/settings" component={MobileNavTabs} />
              </Switch>
            </div>
          </View>
        </View>
      </CompatRouter>
    </Router>
  );
}

function FinancesAppWithContext(props) {
  let app = useMemo(() => <FinancesApp {...props} />, [props]);

  return (
    <SpreadsheetProvider>
      <TitlebarProvider>
        <SidebarProvider>
          <BudgetMonthCountProvider>
            <PayeesProvider>
              <AccountsProvider>
                <DndProvider backend={Backend}>{app}</DndProvider>
              </AccountsProvider>
            </PayeesProvider>
          </BudgetMonthCountProvider>
        </SidebarProvider>
      </TitlebarProvider>
    </SpreadsheetProvider>
  );
}

export default connect(null, actions)(FinancesAppWithContext);
