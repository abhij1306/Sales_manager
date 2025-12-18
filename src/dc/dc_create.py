import streamlit as st
from config.database import get_connection
from datetime import datetime
import uuid

def render_dc_create():
    """Create DC with live preview of output"""
    
    po_number = st.session_state.get('dc_po_context')
    
    # Error handling / Back navigation
    if not po_number:
        st.error("No PO selected")
        if st.button("← Back"):
            st.session_state.nav = 'Purchase Orders'
            st.session_state.po_action = 'list'
            st.rerun()
        return
    
    conn = get_connection()
    
    # Fetch data
    po = conn.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
    items = conn.execute("""
        SELECT * FROM purchase_order_items 
        WHERE po_number = ? AND pending_qty > 0
        ORDER BY po_item_no
    """, (po_number,)).fetchall()
    
    # Compact Header
    col1, col2 = st.columns([3, 2])
    with col1:
        st.markdown(f"### Create DC · PO-{po_number}")
        st.caption(f"{po['supplier_name']}")
    
    with col2:
        btn_cols = st.columns(3)
        with btn_cols[0]:
            if st.button("💾 Save DC", type="primary", use_container_width=True):
                st.session_state.trigger_dc_save = True
        with btn_cols[1]:
            st.button("📥 Download", use_container_width=True, disabled=True)
        with btn_cols[2]:
            if st.button("←", use_container_width=True, help="Back to PO"):
                # Navigate back to PO View properly
                st.session_state.selected_po = po_number
                st.session_state.po_action = 'view'
                st.session_state.nav = 'Purchase Orders'
                
                # Cleanup context
                if 'dc_po_context' in st.session_state:
                    del st.session_state.dc_po_context
                
                st.rerun()
    
    if not items:
        st.warning("All items delivered")
        conn.close()
        return
    
    st.divider()
    
    # --- DC Preview (looks like actual output) ---
    st.markdown("## 📄 Delivery Challan Preview")
    
    # Initialize session state for DC data
    if 'dc_data' not in st.session_state:
        st.session_state.dc_data = {
            'dc_number': '',
            'dc_date': datetime.now().date(),
            'consignee_name': po['inspection_at'] or po['issuer_name'] or '', 
            'consignee_gstin': '',
            'consignee_address': '',
            'vehicle_no': '',
            'lr_no': '',
            'transporter': '',
            'eway_bill': '',
            'items': {} # item_id -> {qty, hsn}
        }
    
    # Editable DC Header (in preview format)
    # Row 1: DC Info
    col1, col2, col3 = st.columns(3)
    with col1:
        st.caption("**DC Number** (Required)")
        dc_num = st.text_input("DC #", value=st.session_state.dc_data['dc_number'], key="dc_num", label_visibility="collapsed")
        st.session_state.dc_data['dc_number'] = dc_num
    with col2:
        st.caption("**DC Date**")
        dc_date = st.date_input("Date", value=st.session_state.dc_data['dc_date'], key="dc_date", label_visibility="collapsed")
        st.session_state.dc_data['dc_date'] = dc_date
    with col3:
        st.caption("**Vehicle No**")
        vehicle = st.text_input("Vehicle", value=st.session_state.dc_data['vehicle_no'], key="dc_vehicle", label_visibility="collapsed")
        st.session_state.dc_data['vehicle_no'] = vehicle
    
    # Row 2: Consignee Info (with Address)
    st.markdown("")
    col1, col2 = st.columns([2, 1])
    with col1:
        st.caption("**Consignee Name**")
        consignee = st.text_input("Name", value=st.session_state.dc_data['consignee_name'], key="dc_consignee", label_visibility="collapsed")
        st.session_state.dc_data['consignee_name'] = consignee
        
        st.caption("**Address**")
        address = st.text_area("Address", value=st.session_state.dc_data['consignee_address'], key="dc_addr", height=70, label_visibility="collapsed")
        st.session_state.dc_data['consignee_address'] = address
        
    with col2:
        st.caption("**GSTIN**")
        gstin = st.text_input("GSTIN", value=st.session_state.dc_data['consignee_gstin'], key="dc_gstin", label_visibility="collapsed")
        st.session_state.dc_data['consignee_gstin'] = gstin
        
        st.caption("**Transport Mode**")
        mode = st.selectbox("Mode", ["Road", "Rail", "Air"], key="dc_mode", label_visibility="collapsed")
    
    # Row 3: Transport Refs
    col1, col2, col3 = st.columns(3)
    with col1:
        st.caption("**LR / RR No**")
        lr = st.text_input("LR#", value=st.session_state.dc_data['lr_no'], key="dc_lr", label_visibility="collapsed")
        st.session_state.dc_data['lr_no'] = lr
    with col2:
        st.caption("**E-way Bill**")
        eway = st.text_input("E-way", value=st.session_state.dc_data['eway_bill'], key="dc_eway", label_visibility="collapsed")
        st.session_state.dc_data['eway_bill'] = eway
    with col3:
        st.caption("**Transporter**")
        transporter = st.text_input("Transporter", value=st.session_state.dc_data['transporter'], key="dc_trans", label_visibility="collapsed")
        st.session_state.dc_data['transporter'] = transporter
    
    st.divider()
    
    # Items table with dispatch qty, HSN, Value
    st.caption("**Items to Dispatch**")
    
    # Header Row
    c1, c2, c3, c4, c5, c6 = st.columns([0.5, 3, 1, 1, 1, 1.5])
    c1.caption("#")
    c2.caption("Description")
    c3.caption("HSN")
    c4.caption("Rate")
    c5.caption("Dispatch")
    c6.caption("Value")
    
    total_val = 0
    total_items_count = 0
    
    for item in items:
        # Defaults
        current_data = st.session_state.dc_data['items'].get(item['id'], {'qty': 0, 'hsn': item['hsn_code'] or ''})
        
        col1, col2, col3, col4, col5, col6 = st.columns([0.5, 3, 1, 1, 1, 1.5])
        
        with col1:
            st.text(f"{item['po_item_no']}")
        with col2:
            st.text(f"{item['material_code']}\n{item['material_description'][:60]}...")
            st.caption(f"Pending: {int(item['pending_qty'] or 0)}")
        with col3:
            # Editable HSN
            new_hsn = st.text_input("HSN", value=current_data['hsn'], key=f"hsn_{item['id']}", label_visibility="collapsed")
        with col4:
            st.text(f"₹{item['po_rate']:,.0f}")
        with col5:
            # Dispatch quantity input
            dispatch_qty = st.number_input(
                "Qty", 
                min_value=0, 
                max_value=int(item['pending_qty'] or 0),
                value=int(current_data['qty']) if 'qty' in current_data else int(current_data.get('qty', 0)),
                key=f"dispatch_{item['id']}",
                label_visibility="collapsed"
            )
        
        # Update session state
        st.session_state.dc_data['items'][item['id']] = {'qty': dispatch_qty, 'hsn': new_hsn}
        
        # Value Calculation
        row_val = dispatch_qty * (item['po_rate'] or 0)
        total_val += row_val
        if dispatch_qty > 0:
            total_items_count += 1
            
        with col6:
            st.text(f"₹{row_val:,.2f}")
    
    st.divider()
    
    # Summary
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Items to Dispatch", total_items_count)
    col2.metric("Total Taxable Value", f"₹{total_val:,.2f}")
    
    # Save DC
    if st.session_state.get('trigger_dc_save', False):
        if not dc_num:
            st.error("DC Number is required")
        elif total_items_count == 0:
            st.error("Please select at least one item to dispatch (Qty > 0)")
        elif not consignee:
             st.error("Consignee Name is required")
        else:
            try:
                # Save to database
                conn.execute("""
                    INSERT INTO delivery_challans
                    (dc_number, dc_date, po_number, consignee_name, consignee_gstin, consignee_address,
                     vehicle_no, lr_no, transporter, eway_bill_no, mode_of_transport)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (dc_num, str(dc_date), po_number, consignee, gstin, address,
                      vehicle, lr, transporter, eway, mode))
                
                # Save items
                for item in items:
                    item_data = st.session_state.dc_data['items'].get(item['id'])
                    dispatch_qty = item_data['qty']
                    hsn_code_val = item_data['hsn']
                    
                    if dispatch_qty > 0:
                        item_id = str(uuid.uuid4())
                        conn.execute("""
                            INSERT INTO delivery_challan_items
                            (id, dc_number, po_item_id, dispatch_qty, hsn_code)
                            VALUES (?, ?, ?, ?, ?)
                        """, (item_id, dc_num, item['id'], dispatch_qty, hsn_code_val))
                        
                        # Update pending qty
                        conn.execute("""
                            UPDATE purchase_order_items
                            SET delivered_qty = delivered_qty + ?,
                                pending_qty = pending_qty - ?
                            WHERE id = ?
                        """, (dispatch_qty, dispatch_qty, item['id']))
                
                conn.commit()
                st.success("✓ DC Created Successfully")
                
                # Clear state
                if 'dc_data' in st.session_state:
                    del st.session_state.dc_data
                if 'trigger_dc_save' in st.session_state:
                    del st.session_state.trigger_dc_save
                
                # Navigate to List
                st.session_state.nav = 'Delivery Challans'
                st.rerun()
                
            except Exception as e:
                st.error(f"Error saving DC: {str(e)}")
    
    conn.close()
