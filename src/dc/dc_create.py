import streamlit as st
from config.database import get_connection
from datetime import datetime
import uuid

def render_dc_create():
    """Create Delivery Challan from a PO"""
    
    # Get PO context
    po_number = st.session_state.get('dc_po_context')
    
    if not po_number:
        st.error("No PO selected for DC creation")
        if st.button("← Back to PO List"):
            st.session_state.po_action = 'list'
            st.rerun()
        return
    
    conn = get_connection()
    
    # Fetch PO Details
    po = conn.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
    
    # Fetch Pending Items
    items = conn.execute("""
        SELECT * FROM purchase_order_items 
        WHERE po_number = ? AND pending_qty > 0
        ORDER BY po_item_no
    """, (po_number,)).fetchall()
    
    st.markdown(f"## Create Delivery Challan")
    st.markdown(f"**Source PO:** PO-{po_number} | **Vendor:** {po['supplier_name']}")
    
    if st.button("← Back to PO"):
        st.session_state.selected_po = po_number
        st.session_state.po_action = 'view'
        del st.session_state.dc_po_context
        st.rerun()
    
    st.markdown("---")
    
    if not items:
        st.warning("No pending items in this PO. All items have been fully delivered.")
        conn.close()
        return
    
    # DC Header
    st.markdown("### Delivery Challan Details")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        dc_number = st.text_input("DC Number *", key="dc_num")
        dc_date = st.date_input("DC Date *", value=datetime.now().date(), key="dc_date")
    
    with col2:
        vehicle_no = st.text_input("Vehicle Number", key="dc_vehicle")
        lr_no = st.text_input("LR Number", key="dc_lr")
    
    with col3:
        transporter = st.text_input("Transporter Name", key="dc_transporter")
        remarks = st.text_area("Remarks", key="dc_remarks", height=60)
    
    st.markdown("---")
    
    # Items Selection
    st.markdown("### Select Items to Dispatch")
    
    if 'dc_items' not in st.session_state:
        st.session_state.dc_items = {}
    
    for item in items:
        col1, col2, col3, col4, col5 = st.columns([2, 4, 1, 2, 2])
        
        with col1:
            st.caption("Material Code")
            st.text(f"{item['material_code']}")
        
        with col2:
            st.caption("Description")
            st.text(item['material_description'][:40] if item['material_description'] else "-")
            
        with col3:
            st.caption("Unit")
            st.text(item['unit'])
        
        with col4:
            st.caption("Pending Qty")
            st.text(f"{float(item['pending_qty']):.0f}")
        
        with col5:
            dispatch_qty = st.number_input(
                "Dispatch Qty",
                min_value=0.0,
                max_value=float(item['pending_qty']),
                value=0.0,
                step=1.0,
                key=f"dispatch_{item['id']}",
                label_visibility="collapsed"
            )
        
        # Selection Logic
        if dispatch_qty > 0:
            st.session_state.dc_items[item['id']] = {
                'po_item_id': item['id'],
                'dispatch_qty': dispatch_qty,
                'material_code': item['material_code']
            }
        else:
            if item['id'] in st.session_state.dc_items:
                del st.session_state.dc_items[item['id']]
        
        st.markdown("<hr style='margin: 0.2rem 0; border-top: 1px solid #1a1a1a;'>", unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Summary
    total_items_dispatching = len(st.session_state.dc_items)
    
    if total_items_dispatching > 0:
        st.info(f"📦 {total_items_dispatching} item(s) selected for dispatch")
    
    # Create DC Button
    col1, col2 = st.columns([3, 1])
    
    with col2:
        if st.button("📄 Generate DC", type="primary", use_container_width=True):
            if not dc_number or not dc_date:
                st.error("Please fill DC Number and Date")
            elif total_items_dispatching == 0:
                st.error("Please select at least one item to dispatch")
            else:
                try:
                    # Create DC in database
                    conn.execute("""
                        INSERT INTO delivery_challans
                        (dc_number, dc_date, po_number, vehicle_no, lr_no, transporter, remarks)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        dc_number,
                        dc_date.strftime('%Y-%m-%d'),
                        po_number,
                        vehicle_no,
                        lr_no,
                        transporter,
                        remarks
                    ))
                    
                    # Insert DC Items
                    for item_data in st.session_state.dc_items.values():
                        item_id = str(uuid.uuid4())
                        conn.execute("""
                            INSERT INTO delivery_challan_items
                            (id, dc_number, po_item_id, dispatch_qty)
                            VALUES (?, ?, ?, ?)
                        """, (
                            item_id,
                            dc_number,
                            item_data['po_item_id'],
                            item_data['dispatch_qty']
                        ))
                        
                        # Update delivered qty in PO items
                        conn.execute("""
                            UPDATE purchase_order_items
                            SET delivered_qty = delivered_qty + ?
                            WHERE id = ?
                        """, (item_data['dispatch_qty'], item_data['po_item_id']))
                    
                    conn.commit()
                    
                    st.success(f"✅ Delivery Challan {dc_number} created successfully!")
                    
                    # Clear session and redirect
                    st.session_state.dc_items = {}
                    if 'dc_po_context' in st.session_state:
                        del st.session_state.dc_po_context
                    
                    st.session_state.dc_action = 'list'
                    st.session_state.nav = 'Delivery Challans'
                    st.rerun()
                    
                except Exception as e:
                    conn.rollback()
                    st.error(f"Error creating Delivery Challan: {str(e)}")
    
    conn.close()
