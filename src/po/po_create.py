import streamlit as st
from config.database import get_connection
from scraper.ingest_po import po_ingestion_service

def render_po_create():
    st.markdown("## Create New Purchase Order")
    
    if st.button("← Back to List"):
        st.session_state.po_action = 'list'
        st.rerun()
    
    st.markdown("---")
    
    # Manual PO Creation Form
    with st.container():
        st.markdown("### PO Header Information")
        
        c1, c2, c3, c4 = st.columns(4)
        
        with c1:
            po_number = st.number_input("PO Number *", min_value=1, step=1, key="new_po_num")
            dvn = st.number_input("DVN", min_value=0, step=1, key="new_dvn")
            
        with c2:
            po_date = st.date_input("PO Date *", key="new_po_date")
            amend_no = st.number_input("Amendment No", min_value=0, step=1, value=0, key="new_amend")
            
        with c3:
            supplier_name = st.text_input("Supplier Name *", key="new_supplier")
            amend_1_date = st.date_input("Amend 1 Date", value=None, key="new_amend1")
            
        with c4:
            supplier_gstin = st.text_input("Supplier GSTIN", key="new_gstin")
            amend_2_date = st.date_input("Amend 2 Date", value=None, key="new_amend2")
            
        col_val, col_rem = st.columns([1, 3])
        with col_val:
            po_value = st.number_input("PO Value", min_value=0.0, step=0.01, key="new_value")
        with col_rem:
             remarks = st.text_input("Remarks", key="new_remarks")
    
    # Items Section
    st.markdown("### Line Items")
    
    if 'new_po_items' not in st.session_state:
        st.session_state.new_po_items = []
    
    # Add Item Form
    with st.expander("➕ Add New Item", expanded=len(st.session_state.new_po_items) == 0):
        c1, c2, c3, c4 = st.columns(4)
        
        with c1:
            item_no = st.number_input("Item No", min_value=1, step=1, key="item_no")
            mat_code = st.text_input("Material Code", key="item_mat")
        
        with c2:
            description = st.text_input("Description", key="item_desc")
            unit = st.selectbox("Unit", ["Nos", "Kg", "Mtr", "Ltr"], key="item_unit")
        
        with c3:
            ord_qty = st.number_input("Ordered Qty", min_value=0.0, step=1.0, key="item_qty")
            po_rate = st.number_input("Rate", min_value=0.0, step=0.01, key="item_rate")
        
        with c4:
            hsn = st.text_input("HSN Code", key="item_hsn")
            st.markdown("<div style='height: 28px'></div>", unsafe_allow_html=True)
            if st.button("Add Item", type="secondary"):
                st.session_state.new_po_items.append({
                    'po_item_no': item_no,
                    'material_code': mat_code,
                    'description': description,
                    'unit': unit,
                    'ord_qty': ord_qty,
                    'po_rate': po_rate,
                    'hsn': hsn,
                    'item_value': ord_qty * po_rate
                })
                st.success(f"✅ Item {item_no} added!")
                st.rerun()
    
    # Display Added Items
    if st.session_state.new_po_items:
        st.markdown("**Items to be added:**")
        for idx, item in enumerate(st.session_state.new_po_items):
            col1, col2 = st.columns([10, 1])
            with col1:
                st.text(f"Item {item['po_item_no']}: {item['material_code']} - Qty: {item['ord_qty']} @ ₹{item['po_rate']}")
            with col2:
                if st.button("🗑️", key=f"del_item_{idx}"):
                    st.session_state.new_po_items.pop(idx)
                    st.rerun()
    
    st.markdown("---")
    
    # Create PO Button
    if st.button("📝 Create Purchase Order", type="primary", use_container_width=True):
        if not po_number or not po_date or not supplier_name:
            st.error("Please fill in all required fields (PO Number, Date, Supplier)")
        elif len(st.session_state.new_po_items) == 0:
            st.error("Please add at least one item")
        else:
            # Create PO Header
            po_header = {
                'PURCHASE ORDER': po_number,
                'PO DATE': po_date.strftime('%d/%m/%Y'),
                'SUPP NAME M/S': supplier_name,
                'SUPPLIER GSTIN': supplier_gstin,
                'DVN': dvn,
                'AMEND NO': amend_no,
                'AMEND 1 DATE': amend_1_date.strftime('%d/%m/%Y') if amend_1_date else '',
                'AMEND 2 DATE': amend_2_date.strftime('%d/%m/%Y') if amend_2_date else '',
                'PO-VALUE': po_value,
                'REMARKS': remarks
            }
            
            # Create Items
            po_items = []
            for item in st.session_state.new_po_items:
                po_items.append({
                    'PO ITM': item['po_item_no'],
                    'MATERIAL CODE': item['material_code'],
                    'DESCRIPTION': item['description'],
                    'UNIT': item['unit'],
                    'ORD QTY': item['ord_qty'],
                    'PO RATE': item['po_rate'],
                    'ITEM VALUE': item['item_value'],
                    'RCD QTY': 0,
                    'DELY QTY': 0,
                    'DELY DATE': '',
                    'ENTRY ALLOW DATE': '',
                    'DEST CODE': None,
                    'LOT NO': None,
                    'MTRL CAT': None
                })
            
            # Ingest
            success, warnings = po_ingestion_service.ingest_po(po_header, po_items)
            
            if success:
                st.success(f"✅ PO-{po_number} created successfully!")
                for w in warnings:
                    st.info(w)
                
                # Clear form
                st.session_state.new_po_items = []
                
                # Go to detail view
                st.session_state.selected_po = po_number
                st.session_state.po_action = 'view'
                st.rerun()
            else:
                st.error("Failed to create PO")
                for w in warnings:
                    st.error(w)
