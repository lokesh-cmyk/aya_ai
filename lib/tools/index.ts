import { getWebSearchTool } from "./web-search";
import { getWeatherTool } from "./weather";
import { getKBSearchTool, isKBSearchConfigured } from "./kb-search";

/**
 * Get web search + weather tools.
 * Returns an empty object for each if the corresponding API key is not configured.
 * Used by both AI Chat stream route and WhatsApp processor.
 */
export function getSearchAndWeatherTools() {
  return {
    ...getWebSearchTool(),
    ...getWeatherTool(),
  };
}

export { getKBSearchTool, isKBSearchConfigured };
export { isWebSearchConfigured } from "./web-search";
export { isWeatherConfigured } from "./weather";
