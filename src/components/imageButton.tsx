import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';

type Props = {
    
  onUploadPress: () => void;
};

const BottomBar: React.FC<Props> = ({ onUploadPress }) => {
  return (
    <View style={{width:57,alignSelf:"center"}}>
      <FAB icon="plus"  onPress={onUploadPress} />
    </View>
  );
};



export default BottomBar;