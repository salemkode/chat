import { useNetInfo } from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const netInfo = useNetInfo()
  return {
    isOnline: netInfo.isConnected === true && netInfo.isInternetReachable !== false,
  }
}
