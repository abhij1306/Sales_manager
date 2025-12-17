import streamlit as st
from scraper.po_scraper import extract_po_header, extract_items
from scraper.ingest_po import po_ingestion_service
from bs4 import BeautifulSoup

def render_po_upload():
    st.markdown("## Upload Purchase Orders")
    
    if st.button("← Back to List"):
        st.session_state.po_action = 'list'
        st.rerun()
    
    st.markdown("Upload HTML PO files - they will be processed automatically")
    uploaded_files = st.file_uploader("Choose HTML files", accept_multiple_files=True, type=['html'], label_visibility="collapsed")
    
    if uploaded_files:
        # Auto-process on upload
        with st.spinner("Processing files..."):
            success_count = 0
            error_count = 0
            
            for idx, file in enumerate(uploaded_files):
                try:
                    content = file.read().decode('utf-8')
                    soup = BeautifulSoup(content, "lxml")
                    
                    header = extract_po_header(soup)
                    items = extract_items(soup)
                    
                    success, warnings = po_ingestion_service.ingest_po(header, items)
                    
                    if success:
                        success_count += 1
                        st.success(f"✅ {file.name}")
                        for w in warnings:
                            st.info(w)
                    else:
                        error_count += 1
                        st.error(f"❌ {file.name}")
                        
                except Exception as e:
                    error_count += 1
                    st.error(f"❌ {file.name}: {str(e)}")
            
            # Summary
            st.success(f"**Processing Complete:** {success_count} uploaded, {error_count} failed")
            
            # Auto-redirect after 2 seconds
            st.markdown("Returning to PO list...")
            import time
            time.sleep(2)
            st.session_state.po_action = 'list'
            st.rerun()
