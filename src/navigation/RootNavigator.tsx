import React, { useState, useRef, useEffect } from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { repository } from '../services/repository';
import { ExerciseListScreen } from '../screens/ExerciseListScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { WorkoutSessionScreen } from '../screens/WorkoutSessionScreen';
import { WorkoutsListScreen } from '../screens/WorkoutsListScreen';
import { CreateWorkoutScreen } from '../screens/CreateWorkoutScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { TrainingSessionScreen } from '../screens/TrainingSessionScreen';
import { TrainingCompletionScreen } from '../screens/TrainingCompletionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ExerciseProgressDetailScreen } from '../screens/ExerciseProgressDetailScreen';
import { RecentWorkoutsScreen } from '../screens/RecentWorkoutsScreen';
import { AuthMenuScreen } from '../screens/AuthMenuScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { VerifyAccountScreen } from '../screens/VerifyAccountScreen';
import { UserPanelScreen } from '../screens/UserPanelScreen';
import { FindUsersScreen } from '../screens/FindUsersScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { CommunityLeaderboardScreen } from '../screens/CommunityLeaderboardScreen';
import { useAuth } from '../store/AuthContext';
import { AuthStackParamList, ExercisesStackParamList, RootTabParamList, UserStackParamList, CommunityStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ExercisesStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AddExerciseContext = React.createContext<{
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
} | null>(null);

export const useAddExerciseDialog = () => {
  const context = React.useContext(AddExerciseContext);
  if (!context) {
    throw new Error('useAddExerciseDialog must be used within RootNavigator');
  }
  return context;
};

const ExercisesStack = ({ showAddDialog, setShowAddDialog, onScreenChange }: { showAddDialog: boolean; setShowAddDialog: (show: boolean) => void; onScreenChange: (screenName: string) => void }) => {
  return (
    <AddExerciseContext.Provider value={{ showAddDialog, setShowAddDialog }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        screenListeners={{
          state: (e) => {
            const state = e.data.state;
            const currentRoute = state.routes[state.index];
            onScreenChange(currentRoute.name);
          },
        }}
      >
        <Stack.Screen
          name="ExerciseListMain"
          options={{ title: 'Ćwiczenia' }}
        >
          {(props) => (
            <ExerciseListScreen
              {...props}
              onSelectExercise={(id) => props.navigation.navigate('ExerciseDetail', { exerciseId: id })}
              onStartWorkout={(id) => props.navigation.navigate('WorkoutSession', { exerciseId: id })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ExerciseDetail"
          options={{ title: 'Szczegóły' }}
        >
          {(props: NativeStackScreenProps<ExercisesStackParamList, 'ExerciseDetail'>) => (
            <ExerciseDetailScreen
              {...props}
              exerciseId={props.route.params.exerciseId}
              onStartWorkout={() => props.navigation.navigate('WorkoutSession', { exerciseId: props.route.params.exerciseId })}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="WorkoutSession"
          options={{ title: 'Trening' }}
        >
          {(props: NativeStackScreenProps<ExercisesStackParamList, 'WorkoutSession'>) => (
            <WorkoutSessionScreen
              {...props}
              exerciseId={props.route.params.exerciseId}
              workoutId={props.route.params.workoutId}
              onComplete={() => {
                props.navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </AddExerciseContext.Provider>
  );
};

const WorkoutsStack = ({ onScreenChange, navigateToCreateRef }: { onScreenChange: (screenName: string) => void; navigateToCreateRef: React.MutableRefObject<(() => void) | null> }) => {
  const WorkoutsStackNavigator = createNativeStackNavigator<ExercisesStackParamList>();
  return (
    <WorkoutsStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          const currentRoute = state.routes[state.index];
          onScreenChange(currentRoute.name);
        },
      }}
    >
      <WorkoutsStackNavigator.Screen
        name="WorkoutsList"
        options={{ title: 'Zestawy Treningowe' }}
      >
        {(props) => {
          // Store navigation callback
          navigateToCreateRef.current = () => {
            props.navigation.navigate('CreateWorkout', {});
          };
          return <WorkoutsListScreen {...props} />;
        }}
      </WorkoutsStackNavigator.Screen>
      <WorkoutsStackNavigator.Screen
        name="CreateWorkout"
        options={{ title: 'Nowy Zestaw' }}
        component={CreateWorkoutScreen}
      />
      <WorkoutsStackNavigator.Screen
        name="WorkoutDetail"
        options={{ title: 'Szczegóły Zestawu' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'WorkoutDetail'>) => (
          <WorkoutDetailScreen
            {...props}
          />
        )}
      </WorkoutsStackNavigator.Screen>
      <WorkoutsStackNavigator.Screen
        name="TrainingSession"
        options={{ title: 'Sesja Treningowa' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'TrainingSession'>) => (
          <TrainingSessionScreen
            {...props}
          />
        )}
      </WorkoutsStackNavigator.Screen>
      <WorkoutsStackNavigator.Screen
        name="TrainingCompletion"
        options={{ title: 'Gratulacje' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'TrainingCompletion'>) => (
          <TrainingCompletionScreen
            {...props}
          />
        )}
      </WorkoutsStackNavigator.Screen>
      <WorkoutsStackNavigator.Screen
        name="ExerciseDetail"
        options={{ title: 'Szczegóły Ćwiczenia' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'ExerciseDetail'>) => (
          <ExerciseDetailScreen
            {...props}
            exerciseId={props.route.params.exerciseId}
            onStartWorkout={() => props.navigation.push('WorkoutSession', { exerciseId: props.route.params.exerciseId })}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </WorkoutsStackNavigator.Screen>
      <WorkoutsStackNavigator.Screen
        name="WorkoutSession"
        options={{ title: 'Trening' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'WorkoutSession'>) => (
          <WorkoutSessionScreen
            {...props}
            exerciseId={props.route.params.exerciseId}
            workoutId={props.route.params.workoutId}
            onComplete={() => {
              props.navigation.goBack();
            }}
          />
        )}
      </WorkoutsStackNavigator.Screen>
    </WorkoutsStackNavigator.Navigator>
  );
};

const ProgressStack = ({ onScreenChange }: { onScreenChange: (screenName: string) => void }) => {
  const ProgressStackNavigator = createNativeStackNavigator<ExercisesStackParamList>();
  return (
    <ProgressStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          const currentRoute = state.routes[state.index];
          onScreenChange(currentRoute.name);
        },
      }}
    >
      <ProgressStackNavigator.Screen
        name="ProgressMain"
        options={{ title: 'Mój Progres' }}
      >
        {(props: NativeStackScreenProps<ExercisesStackParamList, 'ProgressMain'>) => <ProgressScreen {...props} />}
      </ProgressStackNavigator.Screen>
      <ProgressStackNavigator.Screen
        name="ExerciseProgressDetail"
        options={{ title: 'Szczegóły Progresu' }}
        component={ExerciseProgressDetailScreen}
      />
    </ProgressStackNavigator.Navigator>
  );
};

const UserStack = ({ onScreenChange }: { onScreenChange: (screenName: string) => void }) => {
  const UserStackNavigator = createNativeStackNavigator<UserStackParamList>();
  return (
    <UserStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          const currentRoute = state.routes[state.index];
          onScreenChange(currentRoute.name);
        },
      }}
    >
      <UserStackNavigator.Screen
        name="UserPanel"
        options={{ title: 'Panel Użytkownika' }}
        component={UserPanelScreen}
      />
      <UserStackNavigator.Screen
        name="RecentWorkouts"
        options={{ title: 'Historia Treningów' }}
        component={RecentWorkoutsScreen}
      />
      <UserStackNavigator.Screen
        name="ProgressMain"
        options={{ title: 'Mój Progres' }}
        component={ProgressScreen}
      />
      <UserStackNavigator.Screen
        name="ExerciseProgressDetail"
        options={{ title: 'Szczegóły Progresu' }}
        component={ExerciseProgressDetailScreen}
      />
      <UserStackNavigator.Screen
        name="FindUsers"
        options={{ title: 'Znajmoi' }}
        component={FindUsersScreen}
      />
    </UserStackNavigator.Navigator>
  );
};

const CommunityStack = ({ onScreenChange }: { onScreenChange: (screenName: string) => void }) => {
  const CommunityStackNavigator = createNativeStackNavigator<CommunityStackParamList>();
  return (
    <CommunityStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          const currentRoute = state.routes[state.index];
          onScreenChange(currentRoute.name);
        },
      }}
    >
      <CommunityStackNavigator.Screen
        name="CommunityMain"
        options={{ title: 'Społeczność' }}
        component={CommunityScreen}
      />
      <CommunityStackNavigator.Screen
        name="CommunityLeaderboard"
        options={{ title: 'Ranking ćwiczenia' }}
        component={CommunityLeaderboardScreen}
      />
    </CommunityStackNavigator.Navigator>
  );
};

export const RootNavigator = () => {
  const { user } = useAuth();
  const navigationRef = useRef<any>(null);
  const navigateToCreateWorkoutRef = useRef<(() => void) | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState('ExercisesTab');
  const [currentExerciseScreen, setCurrentExerciseScreen] = useState('ExerciseListMain');
  const [currentWorkoutsScreen, setCurrentWorkoutsScreen] = useState('WorkoutsList');
  const [currentCommunityScreen, setCurrentCommunityScreen] = useState('CommunityMain');
  const [currentUserScreen, setCurrentUserScreen] = useState('UserPanel');

  const handleNavigationStateChange = () => {
    const state = navigationRef?.current?.getRootState();
    if (state?.routes) {
      const route = state.routes[state.index];
      setCurrentTab(route?.name || 'ExercisesTab');
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={handleNavigationStateChange}
    >
      {user ? (
        <RootNavigatorContent
          showAddDialog={showAddDialog}
          setShowAddDialog={setShowAddDialog}
          currentTab={currentTab}
          currentExerciseScreen={currentExerciseScreen}
          setCurrentExerciseScreen={setCurrentExerciseScreen}
          currentWorkoutsScreen={currentWorkoutsScreen}
          setCurrentWorkoutsScreen={setCurrentWorkoutsScreen}
          currentCommunityScreen={currentCommunityScreen}
          setCurrentCommunityScreen={setCurrentCommunityScreen}
          currentUserScreen={currentUserScreen}
          setCurrentUserScreen={setCurrentUserScreen}
          navigateToCreateWorkoutRef={navigateToCreateWorkoutRef}
        />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="AuthMenu" component={AuthMenuScreen} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} />
          <AuthStack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const RootNavigatorContent = ({
  showAddDialog,
  setShowAddDialog,
  currentTab,
  currentExerciseScreen,
  setCurrentExerciseScreen,
  currentWorkoutsScreen,
  setCurrentWorkoutsScreen,
  currentCommunityScreen,
  setCurrentCommunityScreen,
  currentUserScreen,
  setCurrentUserScreen,
  navigateToCreateWorkoutRef,
}: {
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
  currentTab: string;
  currentExerciseScreen: string;
  setCurrentExerciseScreen: (screen: string) => void;
  currentWorkoutsScreen: string;
  setCurrentWorkoutsScreen: (screen: string) => void;
  currentCommunityScreen: string;
  setCurrentCommunityScreen: (screen: string) => void;
  currentUserScreen: string;
  setCurrentUserScreen: (screen: string) => void;
  navigateToCreateWorkoutRef: React.MutableRefObject<(() => void) | null>;
}) => {
  const { user } = useAuth();
  const [friendRequestCount, setFriendRequestCount] = useState(0);

  // Subscribe to friend requests
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = repository.observeFriendRequests(
      user.uid,
      (requests) => setFriendRequestCount(requests.length),
      (error) => console.error('Error observing friend requests:', error),
    );

    return unsubscribe;
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="ExercisesTab"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color }) => {
            let iconName: string = 'home';
            if (route.name === 'ExercisesTab') {
              iconName = focused ? 'barbell' : 'barbell-outline';
            } else if (route.name === 'WorkoutsTab') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'CommunityTab') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'UserTab') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={24} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: 12,
            paddingTop: 12,
            height: 85,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
        })}
      >
        <Tab.Screen
          name="ExercisesTab"
          options={{ tabBarLabel: 'Ćwiczenia' }}
        >
          {() => <ExercisesStack showAddDialog={showAddDialog} setShowAddDialog={setShowAddDialog} onScreenChange={setCurrentExerciseScreen} />}
        </Tab.Screen>
        <Tab.Screen
          name="WorkoutsTab"
          options={{ tabBarLabel: 'Zestawy' }}
        >
          {() => <WorkoutsStack onScreenChange={setCurrentWorkoutsScreen} navigateToCreateRef={navigateToCreateWorkoutRef} />}
        </Tab.Screen>
        <Tab.Screen
          name="CommunityTab"
          options={{ tabBarLabel: 'Społeczność' }}
        >
          {() => <CommunityStack onScreenChange={setCurrentCommunityScreen} />}
        </Tab.Screen>
        <Tab.Screen
          name="UserTab"
          options={{
            tabBarLabel: 'Konto',
            tabBarBadge: friendRequestCount > 0 ? friendRequestCount : null,
          }}
        >
          {() => <UserStack onScreenChange={setCurrentUserScreen} />}
        </Tab.Screen>
      </Tab.Navigator>

      {currentTab === 'ExercisesTab' && currentExerciseScreen === 'ExerciseListMain' && (
        <Pressable
          style={styles.floatingButton}
          onPress={() => {
            setShowAddDialog(true);
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      )}
      {currentTab === 'WorkoutsTab' && currentWorkoutsScreen === 'WorkoutsList' && (
        <Pressable
          style={styles.floatingButton}
          onPress={() => {
            if (navigateToCreateWorkoutRef.current) {
              navigateToCreateWorkoutRef.current();
            }
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
