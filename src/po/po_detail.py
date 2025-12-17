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
    
    # Fetch Header
    po = conn.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
    
    # Fetch Items
    items = conn.execute("SELECT * FROM purchase_order_items WHERE po_number = ? ORDER BY po_item_no", (po_number,)).fetchall()
    
    # Header with Actions
    col1, col2, col3 = st.columns([4, 2, 2])
    with col1:
        st.markdown(f"## PO-{po_number}")
        if po['supplier_name']:
            st.markdown(f"**Vendor:** {po['supplier_name']}")
    
    with col2:
        if st.button("✏️ Edit PO", use_container_width=True):
            st.info("Edit mode activated")
    
    with col3:
        if st.button("🚚 Create Delivery Challan", type="primary", use_container_width=True):
            st.session_state.dc_po_context = po_number
            st.session_state.dc_action = 'create'
            st.session_state.nav = 'Delivery Challans'
            st.rerun()
    
    if st.button("← Back to List"):
        st.session_state.po_action = 'list'
        st.rerun()
    
    st.markdown("---")
    
    # Order Details Section with Smart Edit
    st.markdown("### 📋 Order Details")
    
    with st.expander("✏️ Edit Order Details", expanded=False):
        # Tabs for better organization
        tab1, tab2, tab3, tab4 = st.tabs(["Key Info", "Financials & Tax", "Logistics & Ref", "Issuer Details"])
        
        with tab1: # Key Info
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.caption("PO Date")
                po_date_val = datetime.strptime(po['po_date'], '%Y-%m-%d').date() if po['po_date'] else None
                new_po_date = st.date_input("PO Date", value=po_date_val, key="edit_po_date", label_visibility="collapsed")
            with col2:
                st.caption("Supplier Name")
                new_supp_name = st.text_input("Supplier", value=po['supplier_name'] or "", key="edit_supp_name", label_visibility="collapsed")
            with col3:
                st.caption("GSTIN")
                new_supp_gstin = st.text_input("GSTIN", value=po['supplier_gstin'] or "", key="edit_gstin", label_visibility="collapsed")
            with col4:
                st.caption("Supplier Code")
                new_supp_code = st.text_input("Supplier Code", value=po['supplier_code'] or "", key="edit_supp_code", label_visibility="collapsed")

            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.caption("DVN")
                new_dvn = st.text_input("DVN", value=str(po['department_no']) if po['department_no'] else "", key="edit_dvn", label_visibility="collapsed")
            with col2:
                st.caption("Order Type")
                new_ord_type = st.text_input("Order Type", value=po['order_type'] or "", key="edit_ord_type", label_visibility="collapsed")
            with col3:
                st.caption("PO Status")
                new_po_status = st.text_input("Status", value=po['po_status'] or "", key="edit_status", label_visibility="collapsed")
            with col4:
                st.caption("RC No")
                new_rc_no = st.text_input("RC No", value=po['rc_no'] or "", key="edit_rc", label_visibility="collapsed")

        with tab2: # Financials
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.caption("PO Value")
                new_po_val = st.number_input("PO Value", value=float(po['po_value'] or 0), key="edit_val", label_visibility="collapsed")
            with col2:
                st.caption("Net Value")
                new_net_val = st.number_input("Net Value", value=float(po['net_po_value'] or 0), key="edit_net_val", label_visibility="collapsed")
            with col3:
                st.caption("FOB Value")
                new_fob_val = st.number_input("FOB Value", value=float(po['fob_value'] or 0), key="edit_fob", label_visibility="collapsed")
            with col4:
                st.caption("Currency / Ex.Rate")
                c_a, c_b = st.columns(2)
                new_curr = c_a.text_input("Curr", value=po['currency'] or "INR", key="edit_curr", label_visibility="collapsed")
                new_ex = c_b.number_input("Ex", value=float(po['ex_rate'] or 1), key="edit_ex", label_visibility="collapsed")

            col1, col2, col3 = st.columns(3)
            with col1:
                st.caption("TIN No")
                new_tin = st.text_input("TIN", value=po['tin_no'] or "", key="edit_tin", label_visibility="collapsed")
            with col2:
                st.caption("ECC No")
                new_ecc = st.text_input("ECC", value=po['ecc_no'] or "", key="edit_ecc", label_visibility="collapsed")
            with col3:
                st.caption("MPCT No")
                new_mpct = st.text_input("MPCT", value=po['mpct_no'] or "", key="edit_mpct", label_visibility="collapsed")

        with tab3: # Logistics / Ref
            col1, col2, col3 = st.columns(3)
            with col1:
                st.caption("Enquiry No / Date")
                e_a, e_b = st.columns([2, 1])
                new_enq_no = e_a.text_input("Enq No", value=po['enquiry_no'] or "", key="edit_enq", label_visibility="collapsed")
                # Date handling requires robust parsing, using simple text for now or valid date
                enq_dt_val = datetime.strptime(po['enquiry_date'], '%Y-%m-%d').date() if po['enquiry_date'] else None
                new_enq_date = e_b.date_input("Enq Date", value=enq_dt_val, key="edit_enq_date", label_visibility="collapsed")

            with col2:
                st.caption("Quotation Ref / Date")
                q_a, q_b = st.columns([2, 1])
                new_quot = q_a.text_input("Quot", value=po['quotation_ref'] or "", key="edit_quot", label_visibility="collapsed")
                quot_dt_val = datetime.strptime(po['quotation_date'], '%Y-%m-%d').date() if po['quotation_date'] else None
                new_quot_date = q_b.date_input("Quot Date", value=quot_dt_val, key="edit_quot_date", label_visibility="collapsed")
            
            with col3:
                st.caption("Inspection")
                new_insp_by = st.text_input("By", value=po['inspection_by'] or "", key="edit_insp_by", placeholder="Inspection By", label_visibility="collapsed")
                new_insp_at = st.text_input("At", value=po['inspection_at'] or "", key="edit_insp_at", placeholder="Inspection At", label_visibility="collapsed")

        with tab4: # Issuer
            col1, col2, col3 = st.columns(3)
            with col1:
                st.caption("Issuer Name")
                new_iss_name = st.text_input("Name", value=po['issuer_name'] or "", key="edit_iss_name", label_visibility="collapsed")
            with col2:
                st.caption("Designation")
                new_iss_desg = st.text_input("Desg", value=po['issuer_designation'] or "", key="edit_iss_desg", label_visibility="collapsed")
            with col3:
                st.caption("Phone")
                new_iss_ph = st.text_input("Phone", value=po['issuer_phone'] or "", key="edit_iss_ph", label_visibility="collapsed")

        st.markdown("---")
        st.caption("Remarks")
        new_remarks = st.text_area("Remarks", value=po['remarks'] or "", key="edit_remarks", height=60, label_visibility="collapsed")
        
        if st.button("💾 Save Changes", type="primary"):
            conn.execute("""
                UPDATE purchase_orders 
                SET po_date=?, supplier_name=?, supplier_gstin=?, supplier_code=?, department_no=?,
                    enquiry_no=?, enquiry_date=?, quotation_ref=?, quotation_date=?, rc_no=?, order_type=?, po_status=?,
                    tin_no=?, ecc_no=?, mpct_no=?, po_value=?, fob_value=?, ex_rate=?, currency=?, net_po_value=?,
                    inspection_by=?, inspection_at=?, issuer_name=?, issuer_designation=?, issuer_phone=?, remarks=?,
                    updated_at=CURRENT_TIMESTAMP
                WHERE po_number=?
            """, (
                new_po_date, new_supp_name, new_supp_gstin, new_supp_code, new_dvn,
                new_enq_no, new_enq_date, new_quot, new_quot_date, new_rc_no, new_ord_type, new_po_status,
                new_tin, new_ecc, new_mpct, new_po_val, new_fob_val, new_ex, new_curr, new_net_val,
                new_insp_by, new_insp_at, new_iss_name, new_iss_desg, new_iss_ph, new_remarks,
                po_number
            ))
            conn.commit()
            st.success("✅ PO Details Updated!")
            st.rerun()
    
    st.markdown("---")
    
    # Items Table
    st.markdown("### 📦 Order Items")
    
    if items:
        # Create DataFrame for display
        items_data = []
        for item in items:
            items_data.append({
                "Item No": item['po_item_no'],
                "Material Code": item['material_code'] or "",
                "Description": item['material_description'] or "",
                "Unit": item['unit'] or "",
                "Ordered": float(item['ord_qty'] or 0),
                "Delivered": float(item['delivered_qty'] or 0),
                "Pending": float(item['pending_qty'] or 0),
                "Rate": float(item['po_rate'] or 0),
                "Total": float(item['item_value'] or 0)
            })
        
        df = pd.DataFrame(items_data)
        
        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Ordered": st.column_config.NumberColumn(format="%.0f"),
                "Delivered": st.column_config.NumberColumn(format="%.0f"),
                "Pending": st.column_config.NumberColumn(format="%.0f"),
                "Rate": st.column_config.NumberColumn(format="₹ %.2f"),
                "Total": st.column_config.NumberColumn(format="₹ %.2f")
            }
        )
        
        # Edit Individual Items
        with st.expander("✏️ Edit Items"):
            st.info("Select an item to edit")
            
            item_options = [f"Item {i['po_item_no']} - {i['material_code']}" for i in items]
            selected_item_idx = st.selectbox("Select Item", range(len(items)), format_func=lambda x: item_options[x])
            
            if selected_item_idx is not None:
                item = items[selected_item_idx]
                
                c1, c2, c3 = st.columns(3)
                with c1:
                    new_mat_code = st.text_input("Material Code", value=item['material_code'] or "", key=f"mat_{item['id']}")
                    new_desc = st.text_input("Description", value=item['material_description'] or "", key=f"desc_{item['id']}")
                
                with c2:
                    new_qty = st.number_input("Ordered Qty", value=float(item['ord_qty'] or 0), key=f"qty_{item['id']}")
                    new_rate = st.number_input("Rate", value=float(item['po_rate'] or 0), key=f"rate_{item['id']}")
                
                with c3:
                    new_unit = st.text_input("Unit", value=item['unit'] or "", key=f"unit_{item['id']}")
                    new_hsn = st.text_input("HSN", value=item['hsn_code'] or "", key=f"hsn_{item['id']}")
                
                if st.button("💾 Update Item"):
                    conn.execute("""
                        UPDATE purchase_order_items
                        SET material_code = ?, material_description = ?, ord_qty = ?, po_rate = ?,
                            unit = ?, hsn_code = ?, item_value = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (new_mat_code, new_desc, new_qty, new_rate, new_unit, new_hsn, new_qty * new_rate, item['id']))
                    conn.commit()
                    st.success("✅ Item updated!")
                    st.rerun()
    else:
        st.info("No items found for this PO.")
    
    conn.close()
