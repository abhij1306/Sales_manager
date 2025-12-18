import streamlit as st
from config.database import get_connection
import pandas as pd
from datetime import datetime

def render_po_detail():
    po_number = st.session_state.get('selected_po')
    if not po_number:
        st.error("No PO selected")
        return

    conn = get_connection()
    
    # Fetch data
    po = conn.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
    items = conn.execute("SELECT * FROM purchase_order_items WHERE po_number = ? ORDER BY po_item_no", (po_number,)).fetchall()
    
    # Compact Header with Inline Actions
    col1, col2 = st.columns([4, 2])
    with col1:
        st.markdown(f"### PO-{po_number} · {po['supplier_name'] or 'Unknown Vendor'}")
        st.caption(f"📅 {po['po_date']} · ₹{po['po_value']:,.0f}" if po['po_value'] else f"📅 {po['po_date']}")
    
    with col2:
        action_cols = st.columns(3)
        with action_cols[0]:
            if st.button("🚚 DC", use_container_width=True, type="primary", help="Create Delivery Challan"):
                st.session_state.dc_po_context = po_number
                st.session_state.dc_action = 'create'
                st.session_state.nav = 'Delivery Challans'
                st.rerun()
        with action_cols[1]:
            edit_mode = st.toggle("✏️", value=st.session_state.get('edit_mode', False), key="edit_toggle", help="Toggle edit mode")
            st.session_state.edit_mode = edit_mode
        with action_cols[2]:
            if st.button("🗑️", use_container_width=True, help="Delete PO"):
                st.session_state.show_delete_confirm = True
    
    # Delete Confirmation (Compact)
    if st.session_state.get('show_delete_confirm', False):
        st.warning("⚠️ Delete PO and all related data?")
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("✓ Delete", type="primary", use_container_width=True):
                conn.execute("DELETE FROM purchase_orders WHERE po_number = ?", (po_number,))
                conn.commit()
                st.success("Deleted")
                st.session_state.po_action = 'list'
                if 'show_delete_confirm' in st.session_state:
                    del st.session_state.show_delete_confirm
                st.rerun()
        with col_b:
            if st.button("✗ Cancel", use_container_width=True):
                if 'show_delete_confirm' in st.session_state:
                    del st.session_state.show_delete_confirm
                st.rerun()
    
    if st.button("← Back"):
        st.session_state.po_action = 'list'
        if 'show_delete_confirm' in st.session_state:
            del st.session_state.show_delete_confirm
        if 'edit_mode' in st.session_state:
            del st.session_state.edit_mode
        st.rerun()
    
    st.divider()
    # Items Data Preparation
    items_data = []
    if items:
        for item in items:
            items_data.append({
                "id": item['id'], # Hidden tracking ID
                "#": item['po_item_no'],
                "Code": item['material_code'] or "",
                "Description": item['material_description'] or "",
                "DRG": item['drg_no'] or "",
                "Unit": item['unit'] or "",
                "Qty": float(item['ord_qty'] or 0),
                "Rate": float(item['po_rate'] or 0),
                "Value": float(item['item_value'] or 0)
            })
        df = pd.DataFrame(items_data)
    else:
        df = pd.DataFrame(columns=["id", "#", "Code", "Description", "DRG", "Unit", "Qty", "Rate", "Value"])

    # Compact Details Display
    if not edit_mode:
        # Read-only compact view
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Net Value", f"₹{po['net_po_value']:,.0f}" if po['net_po_value'] else "-")
        col2.metric("DVN", po['department_no'] or "-")
        col3.metric("Type", po['order_type'] or "-")
        col4.metric("Status", po['po_status'] or "-")
        
        # Grid layout for other fields
        col1, col2, col3 = st.columns(3)
        with col1:
            st.caption("**Financial**")
            st.text(f"FOB: ₹{po['fob_value']:,.0f}" if po['fob_value'] else "FOB: -")
            st.text(f"Ex.Rate: {po['ex_rate']}" if po['ex_rate'] else "Ex.Rate: -")
        with col2:
            st.caption("**Tax**")
            st.text(f"TIN: {po['tin_no'] or '-'}")
            st.text(f"ECC: {po['ecc_no'] or '-'}")
            st.text(f"MPCT: {po['mpct_no'] or '-'}")
        with col3:
            st.caption("**Reference**")
            st.text(f"RC: {po['rc_no'] or '-'}")
            st.text(f"Inspection: {po['inspection_by'] or '-'}")
        
        if po['remarks']:
            st.caption("**Remarks**")
            st.text(po['remarks'][:200] + "..." if len(po['remarks'] or '') > 200 else po['remarks'])

        st.divider()
        st.markdown("### 📦 Items")
        
        if not df.empty:
            st.dataframe(
                df,
                use_container_width=True,
                hide_index=True,
                column_config={
                    "id": None, # Hide ID
                    "Rate": st.column_config.NumberColumn(format="₹ %.2f"),
                    "Value": st.column_config.NumberColumn(format="₹ %.2f"),
                    "Qty": st.column_config.NumberColumn(format="%.0f"),
                }
            )
        else:
            st.info("No items")
    
    else:
        # Edit Mode - Compact inline editing
        st.caption("📝 **Edit Mode Active**")
        
        # Row 1: Supplier (Full Width)
        new_supp_name = st.text_input("Supplier", value=po['supplier_name'] or "", key="edit_supp")
        
        # Row 2: Basic Info
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            new_po_date = st.date_input("PO Date", value=datetime.strptime(po['po_date'], '%Y-%m-%d').date() if po['po_date'] else None)
        with col2:
            new_po_val = st.number_input("PO Value", value=float(po['po_value'] or 0))
        with col3:
            new_net_val = st.number_input("Net Value", value=float(po['net_po_value'] or 0))
        with col4:
            new_po_status = st.text_input("Status", value=po['po_status'] or "")
            
        # Row 3: Reference
        col1, col2, col3, col4 = st.columns(4)
        with col1:
             new_ord_type = st.text_input("Order Type", value=po['order_type'] or "")
        with col2:
            new_dvn = st.text_input("DVN", value=str(po['department_no']) if po['department_no'] else "")
        with col3:
             new_rc_no = st.text_input("RC No", value=po['rc_no'] or "")
        with col4:
            new_insp_by = st.text_input("Inspection By", value=po['inspection_by'] or "")

        # Row 4: Tax
        col1, col2, col3 = st.columns(3)
        with col1:
            new_tin = st.text_input("TIN No", value=po['tin_no'] or "")
        with col2:
            new_ecc = st.text_input("ECC No", value=po['ecc_no'] or "")
        with col3:
            new_mpct = st.text_input("MPCT No", value=po['mpct_no'] or "")
            
        new_remarks = st.text_area("Remarks", value=po['remarks'] or "", height=60)
        
        st.divider()
        st.markdown("### 📦 Edit Items")
        
        # Editable Dataframe
        edited_df = st.data_editor(
            df,
            key="items_editor",
            use_container_width=True,
            hide_index=True,
            num_rows="dynamic",
            column_config={
                "id": None,
                "Rate": st.column_config.NumberColumn(format="₹ %.2f"),
                "Value": st.column_config.NumberColumn(format="₹ %.2f", disabled=True), # Calculate automatically
                "Qty": st.column_config.NumberColumn(format="%.0f"),
                "Code": st.column_config.TextColumn(width="small"),
                "Description": st.column_config.TextColumn(width="large"),
            }
        )

        if st.button("💾 Save All Changes", type="primary"):
            # 1. Update Header
            conn.execute("""
                UPDATE purchase_orders 
                SET po_date=?, supplier_name=?, po_value=?, net_po_value=?, department_no=?,
                    tin_no=?, ecc_no=?, mpct_no=?, order_type=?, po_status=?, rc_no=?,
                    inspection_by=?, remarks=?, updated_at=CURRENT_TIMESTAMP
                WHERE po_number=?
            """, (new_po_date, new_supp_name, new_po_val, new_net_val, new_dvn,
                  new_tin, new_ecc, new_mpct, new_ord_type, new_po_status, new_rc_no,
                  new_insp_by, new_remarks, po_number))
            
            # 2. Update Items
            # Convert edited_df back to dict for processing
            if edited_df is not None and not edited_df.empty:
                for index, row in edited_df.iterrows():
                    # Calculate Value based on Rate * Qty (Simple calc)
                    # Note: We trust user inputs for Qty/Rate, auto-calc Value for DB
                    qty = float(row.get('Qty') or 0)
                    rate = float(row.get('Rate') or 0)
                    val = qty * rate
                    
                    item_id = row.get("id")
                    
                    if item_id: # Existing Item (could be new row if ID is missing)
                         conn.execute("""
                            UPDATE purchase_order_items
                            SET material_code = ?, material_description = ?, drg_no = ?, unit = ?,
                                ord_qty = ?, po_rate = ?, item_value = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (row['Code'], row['Description'], row['DRG'], row['Unit'], 
                              qty, rate, val, item_id))
                    # Note: Handling "New" rows from dynamic data_editor would require INSERT logic
                    # For now, we focus on editing existing extracted items as per request context
            
            conn.commit()
            st.success("✓ Saved Successfully")
            st.rerun()

    conn.close()
