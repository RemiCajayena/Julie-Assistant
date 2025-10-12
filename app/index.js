import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <Text>Home Screen</Text>      
    </View>
  )
} 