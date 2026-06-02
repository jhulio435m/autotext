import { geotecniaTemplates } from './geotecnia';
import { hidraulicaTemplates } from './hidraulica';
import { memoriaDescriptivaTemplates } from './memoria-descriptiva';
import { formato6ATemplates } from './formato6a';

export const SYSTEM_TEMPLATES = [...formato6ATemplates, ...geotecniaTemplates, ...hidraulicaTemplates, ...memoriaDescriptivaTemplates];
