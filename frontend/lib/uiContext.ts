export interface UIContext {
    current_page: string;
    active_entity_id?: string;
    active_entity_type?: 'po' | 'dc' | 'invoice';
    visible_ids: string[];
    filters?: Record<string, any>;
    form_data?: Record<string, any>;
}

class UIContextManager {
    private context: UIContext = {
        current_page: 'dashboard',
        visible_ids: [],
        filters: {}
    };

    // Update the current page identifier
    setPage(page: string) {
        this.context.current_page = page;
        // Reset specific context when changing pages unless explicit preservation needed
        this.context.active_entity_id = undefined;
        this.context.active_entity_type = undefined;
    }

    // Set the active entity being viewed/edited
    setActiveEntity(type: 'po' | 'dc' | 'invoice', id: string) {
        this.context.active_entity_type = type;
        this.context.active_entity_id = id;
    }

    // Update list of currently visible record IDs (for "that" reference)
    setVisibleIds(ids: string[]) {
        this.context.visible_ids = ids;
    }

    // Update current filters to help agent understand what user sees
    setFilters(filters: Record<string, any>) {
        this.context.filters = filters;
    }

    // Get a snapshot of the context to send with voice request
    getContext(): UIContext {
        return { ...this.context };
    }
}

// Global singleton instance
export const uiContext = new UIContextManager();
