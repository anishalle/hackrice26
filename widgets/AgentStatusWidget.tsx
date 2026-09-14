import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type AgentStatusProps = {
  activeCount: number;
};

const AgentStatusWidget = (props: AgentStatusProps, environment: WidgetEnvironment) => {
  'widget';
  const label = props.activeCount === 1 ? 'agent active' : 'agents active';

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text modifiers={[font({ weight: 'bold', size: 28 }), foregroundStyle('#5B57F2')]}>
        {props.activeCount}
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle('#6B6B66')]}>{label}</Text>
    </VStack>
  );
};

export default createWidget('AgentStatusWidget', AgentStatusWidget);
