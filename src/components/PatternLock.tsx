import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = Math.min(width - 80, 300);
const DOT_RADIUS = 12;
const ACTIVE_RADIUS = 20;
const PADDING = 40;
const STEP = (SIZE - PADDING * 2) / 2;

const getDotCoords = (index: number) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return { x: PADDING + col * STEP, y: PADDING + row * STEP };
};

export default function PatternLock({ onComplete }: { onComplete: (pattern: string) => void }) {
  const [path, setPath] = useState<number[]>([]);
  const [activeLine, setActiveLine] = useState<{ x: number; y: number } | null>(null);
  const pathRef = useRef<number[]>([]);

  const reset = () => {
    setPath([]);
    pathRef.current = [];
    setActiveLine(null);
  };

  const getTouchedDot = (x: number, y: number) => {
    for (let i = 0; i < 9; i++) {
      const { x: cx, y: cy } = getDotCoords(i);
      // Fast distance calculation to avoid stutter
      if ((x - cx) ** 2 + (y - cy) ** 2 < 900) return i;
    }
    return -1;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        reset();
        const { locationX, locationY } = evt.nativeEvent;
        const dot = getTouchedDot(locationX, locationY);
        if (dot !== -1) {
          pathRef.current = [dot];
          setPath([dot]);
          setActiveLine({ x: locationX, y: locationY });
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setActiveLine({ x: locationX, y: locationY });
        const dot = getTouchedDot(locationX, locationY);
        if (dot !== -1 && !pathRef.current.includes(dot)) {
          pathRef.current.push(dot);
          setPath([...pathRef.current]);
        }
      },
      onPanResponderRelease: () => {
        if (pathRef.current.length >= 4) {
          onComplete(pathRef.current.join('-'));
        }
        setTimeout(reset, 300);
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width={SIZE} height={SIZE}>
        {path.map((dot, i) => {
          if (i === path.length - 1) return null;
          const p1 = getDotCoords(dot);
          const p2 = getDotCoords(path[i + 1]);
          return <Line key={`l-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ef4444" strokeWidth={4} strokeLinecap="round" />;
        })}
        {activeLine && path.length > 0 && (
          <Line x1={getDotCoords(path[path.length - 1]).x} y1={getDotCoords(path[path.length - 1]).y} x2={activeLine.x} y2={activeLine.y} stroke="#ef4444" strokeWidth={4} strokeLinecap="round" strokeOpacity={0.5} />
        )}
        {Array.from({ length: 9 }).map((_, i) => {
          const { x, y } = getDotCoords(i);
          const isActive = path.includes(i);
          return (
            <React.Fragment key={`d-${i}`}>
              <Circle cx={x} cy={y} r={ACTIVE_RADIUS} fill={isActive ? 'rgba(239,68,68,0.15)' : 'transparent'} />
              <Circle cx={x} cy={y} r={DOT_RADIUS} fill={isActive ? '#ef4444' : '#1f1f1f'} stroke={isActive ? '#ef4444' : '#6d7382'} strokeWidth={2} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ container: { width: SIZE, height: SIZE, alignSelf: 'center' } });
