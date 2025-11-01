// src/components/CustomerTable.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCustomers } from '../utils/indexedDB';
import '../styles/CustomerTable.css';
import filterIcon from '../assets/test_Filter.svg';
import searchIcon from '../assets/test_Search-3.svg';

/**
 * Main customer table component with VIRTUAL SCROLLBAR
 * Can jump to any row (1 to 1,000,000) instantly
 */
export default function CustomerTable() {
  // State management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(1000000);
  const [currentRow, setCurrentRow] = useState(1);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  
  // Refs
  const searchTimeout = useRef(null);
  const filterRef = useRef(null);
  const scrollbarRef = useRef(null);
  const isDragging = useRef(false);
  
  const ITEMS_PER_PAGE = 30;
  const ROW_HEIGHT = 60; // Approximate row height in pixels

  /**
   * Load customers from specific offset
   */
  const loadCustomersAtOffset = useCallback(async (offset) => {
    setLoading(true);
    
    try {
      const result = await getCustomers({
        offset,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        sortBy,
        sortOrder
      });
      
      setCustomers(result.data);
      setTotalCount(result.total);
      setCurrentRow(offset + 1);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, sortBy, sortOrder]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadCustomersAtOffset(0);
  }, [searchTerm, sortBy, sortOrder]);

  /**
   * Handle virtual scrollbar drag
   */
  const handleScrollbarMouseDown = (e) => {
    isDragging.current = true;
    updateScrollPosition(e);
    document.addEventListener('mousemove', handleScrollbarMouseMove);
    document.addEventListener('mouseup', handleScrollbarMouseUp);
  };

  const handleScrollbarMouseMove = (e) => {
    if (isDragging.current) {
      updateScrollPosition(e);
    }
  };

  const handleScrollbarMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleScrollbarMouseMove);
    document.removeEventListener('mouseup', handleScrollbarMouseUp);
  };

  const updateScrollPosition = (e) => {
    if (!scrollbarRef.current) return;
    
    const rect = scrollbarRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1, y / rect.height));
    
    setScrollPercentage(percentage);
    const targetRow = Math.floor(percentage * totalCount);
    const offset = Math.max(0, Math.min(totalCount - ITEMS_PER_PAGE, targetRow));
    
    loadCustomersAtOffset(offset);
  };

  /**
   * Handle mouse wheel scrolling
   */
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? ITEMS_PER_PAGE : -ITEMS_PER_PAGE;
    const newOffset = Math.max(0, Math.min(totalCount - ITEMS_PER_PAGE, currentRow - 1 + delta));
    const newPercentage = newOffset / totalCount;
    
    setScrollPercentage(newPercentage);
    loadCustomersAtOffset(newOffset);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    let newOffset = currentRow - 1;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        newOffset = Math.min(totalCount - ITEMS_PER_PAGE, newOffset + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newOffset = Math.max(0, newOffset - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        newOffset = Math.min(totalCount - ITEMS_PER_PAGE, newOffset + ITEMS_PER_PAGE);
        break;
      case 'PageUp':
        e.preventDefault();
        newOffset = Math.max(0, newOffset - ITEMS_PER_PAGE);
        break;
      case 'Home':
        e.preventDefault();
        newOffset = 0;
        break;
      case 'End':
        e.preventDefault();
        newOffset = totalCount - ITEMS_PER_PAGE;
        break;
      default:
        return;
    }
    
    setScrollPercentage(newOffset / totalCount);
    loadCustomersAtOffset(newOffset);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRow, totalCount]);

  /**
   * Close filter dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  /**
   * Debounced search handler
   */
  const handleSearch = (e) => {
    const value = e.target.value;
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentRow(1);
      setScrollPercentage(0);
    }, 250);
  };

  /**
   * Column sort handler
   */
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentRow(1);
    setScrollPercentage(0);
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${month} ${day}, ${year}, ${time}`;
  };

  /**
   * Render sort indicator
   */
  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  /**
   * Get pagination text
   */
  const getPaginationText = () => {
    const start = currentRow;
    const end = Math.min(currentRow + customers.length - 1, totalCount);
    return `${start.toLocaleString()}-${end.toLocaleString()} of ${totalCount.toLocaleString()}`;
  };

  /**
   * Jump to specific row
   */
  const handleJumpToRow = (e) => {
    e.preventDefault();
    const input = e.target.elements.rowNumber;
    const rowNumber = parseInt(input.value);
    
    if (rowNumber >= 1 && rowNumber <= totalCount) {
      const offset = Math.max(0, rowNumber - 1);
      setScrollPercentage(offset / totalCount);
      loadCustomersAtOffset(offset);
      input.value = '';
    }
  };

  return (
    <div className="customer-table-container">
      {/* ===== HEADER ===== */}
      <div className="app-header">
        <div className="header-left">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
              <path 
                d="M8 24L18 34L40 12" 
                stroke="#10B981" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M8 24L18 34L40 12" 
                stroke="#10B981" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                transform="translate(0, 8)"
              />
            </svg>
            <h1>DoubleTick</h1>
          </div>
        </div>
        <button className="menu-button" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* ===== SUB-HEADER ===== */}
      <div className="sub-header">
        <h2 className="customers-title">
          All Customers <span className="count">{totalCount.toLocaleString()}</span>
        </h2>
      </div>

      {/* ===== SEARCH AND FILTERS ===== */}
      <div className="controls">
        <div className="search-box">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Customers"
            onChange={handleSearch}
            className="search-input"
            aria-label="Search customers"
          />
        </div>
        
        <div className="filter-dropdown" ref={filterRef}>
          <button 
            className="filter-button"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <img src={filterIcon} alt="Filter" />
            Add Filters
          </button>
          
          {showFilters && (
            <div className="filter-menu" role="menu">
              <div className="filter-item" role="menuitem">Status Filter</div>
              <div className="filter-item" role="menuitem">Score Range</div>
              <div className="filter-item" role="menuitem">Date Range</div>
              <div className="filter-item" role="menuitem">Agent Filter</div>
            </div>
          )}
        </div>

        {/* Jump to Row Input */}
        <form onSubmit={handleJumpToRow} className="jump-to-row">
          <input
            type="number"
            name="rowNumber"
            placeholder="Jump to row..."
            min="1"
            max={totalCount}
            className="jump-input"
          />
          <button type="submit" className="jump-button">Go</button>
        </form>
      </div>

      {/* ===== PAGINATION COUNTER ===== */}
      <div className="pagination-info">
        <span className="pagination-text">{getPaginationText()}</span>
        <span className="pagination-hint">Use mouse wheel, arrow keys, or drag scrollbar →</span>
      </div>

      {/* ===== TABLE WITH VIRTUAL SCROLLBAR ===== */}
      <div className="table-container">
        <div className="table-wrapper" onWheel={handleWheel}>
          <table className="customer-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input type="checkbox" aria-label="Select all customers" />
                </th>
                <th 
                  onClick={() => handleSort('name')} 
                  className="sortable customer-col"
                  role="button"
                  tabIndex={0}
                >
                  Customer{renderSortIcon('name')}
                </th>
                <th 
                  onClick={() => handleSort('phone')} 
                  className="sortable"
                  role="button"
                  tabIndex={0}
                >
                  Phone{renderSortIcon('phone')}
                </th>
                <th 
                  onClick={() => handleSort('email')} 
                  className="sortable"
                  role="button"
                  tabIndex={0}
                >
                  Email{renderSortIcon('email')}
                </th>
                <th 
                  onClick={() => handleSort('score')} 
                  className="sortable score-col"
                  role="button"
                  tabIndex={0}
                >
                  Score{renderSortIcon('score')}
                </th>
                <th 
                  onClick={() => handleSort('lastMessageAt')} 
                  className="sortable"
                  role="button"
                  tabIndex={0}
                >
                  Last message sent at{renderSortIcon('lastMessageAt')}
                </th>
                <th>Added by</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="loading-cell">
                    Loading rows {currentRow.toLocaleString()}-{(currentRow + ITEMS_PER_PAGE - 1).toLocaleString()}...
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="checkbox-col">
                      <input 
                        type="checkbox" 
                        aria-label={`Select ${customer.name}`} 
                      />
                    </td>
                    <td className="customer-col">
                      <div className="customer-cell">
                        <img 
                          src={customer.avatar} 
                          alt={customer.name} 
                          className="avatar" 
                        />
                        <div className="customer-info">
                          <div className="customer-name">{customer.name}</div>
                          <div className="customer-phone">{customer.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.email}</td>
                    <td className="score-col">{customer.score}</td>
                    <td>{formatDate(customer.lastMessageAt)}</td>
                    <td className="added-by">
                      <span className="agent-icon">👤</span> {customer.addedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VIRTUAL SCROLLBAR */}
        <div 
          className="virtual-scrollbar"
          ref={scrollbarRef}
          onMouseDown={handleScrollbarMouseDown}
        >
          <div 
            className="scrollbar-thumb"
            style={{ 
              top: `${scrollPercentage * 100}%`,
              height: `${(ITEMS_PER_PAGE / totalCount) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}