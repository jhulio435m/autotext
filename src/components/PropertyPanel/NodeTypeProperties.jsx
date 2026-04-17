import { Section } from './shared';

// Import extracted views
import { TextProperties, TemplateTextProperties, AiTextProperties } from './views/TextPropertiesView';
import { TableProperties } from './views/TablePropertiesView';
import { ImageProperties, LatexGraphProperties } from './views/MediaPropertiesView';
import { VariableProperties } from './views/VariablePropertiesView';

export function NodeTypeProperties({ selectedNode, update, tableValue, updateTableValue }) {
  switch (selectedNode.type) {
    case 'text':
    case 'rich_text':
      return <TextProperties selectedNode={selectedNode} update={update} />;
    case 'template_text':
      return <TemplateTextProperties selectedNode={selectedNode} update={update} />;
    case 'ai_text':
      return <AiTextProperties selectedNode={selectedNode} update={update} />;
    case 'table':
      return (
        <TableProperties
          selectedNode={selectedNode}
          update={update}
          tableValue={tableValue}
          updateTableValue={updateTableValue}
        />
      );
    case 'image':
      return <ImageProperties selectedNode={selectedNode} update={update} />;
    case 'latex_graph':
      return <LatexGraphProperties selectedNode={selectedNode} update={update} />;
    case 'variable':
      return <VariableProperties selectedNode={selectedNode} update={update} />;
    default:
      return null;
  }
}
