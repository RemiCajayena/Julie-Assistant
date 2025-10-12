import { StyleSheet, Text, View } from 'react-native';

export default function MicrophoneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla del Micrófono</Text>
      <Text style={styles.subtext}>Esta pantalla se activa cuando presionas el botón del micrófono</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});