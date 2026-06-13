"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing pagination state with localStorage persistence
 * @param {string} storageKey - Key for localStorage (e.g., 'appointments_page')
 * @param {number} defaultPage - Default page number (default: 1)
 * @param {number} defaultItemsPerPage - Default items per page (default: 5)
 * @returns {object} Pagination state and methods
 */
export default function usePagination(storageKey, defaultPage = 1, defaultItemsPerPage = 5) {
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [isPersistent, setIsPersistent] = useState(true);

  // Load saved page from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey && isPersistent) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const page = parseInt(saved, 10);
          if (page > 0) {
            setCurrentPage(page);
          }
        }
        
        const savedItemsPerPage = localStorage.getItem(`${storageKey}_perPage`);
        if (savedItemsPerPage) {
          const perPage = parseInt(savedItemsPerPage, 10);
          if (perPage > 0) {
            setItemsPerPage(perPage);
          }
        }
      } catch (error) {
        console.warn('Failed to load saved pagination:', error);
      }
    }
  }, [storageKey, isPersistent]);

  // Save page to localStorage when it changes
  const handlePageChange = useCallback((page) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
    
    if (typeof window !== 'undefined' && storageKey && isPersistent) {
      localStorage.setItem(storageKey, validPage.toString());
    }
  }, [storageKey, totalPages, isPersistent]);

  // Change items per page
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    const validItemsPerPage = Math.max(1, Math.min(newItemsPerPage, 100));
    setItemsPerPage(validItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    if (typeof window !== 'undefined' && storageKey && isPersistent) {
      localStorage.setItem(`${storageKey}_perPage`, validItemsPerPage.toString());
      localStorage.setItem(storageKey, '1');
    }
  }, [storageKey, isPersistent]);

  // Update pagination metadata from API response
  const updatePagination = useCallback((data) => {
    if (data.meta) {
      setTotalPages(data.meta.totalPages || 1);
      setTotalItems(data.meta.total || 0);
      setCurrentPage(data.meta.page || 1);
      if (data.meta.limit) {
        setItemsPerPage(data.meta.limit);
      }
    } else if (data.total !== undefined) {
      const pages = Math.ceil(data.total / itemsPerPage);
      setTotalPages(pages);
      setTotalItems(data.total);
    } else if (data.pagination) {
      setTotalPages(data.pagination.totalPages || 1);
      setTotalItems(data.pagination.total || 0);
      setCurrentPage(data.pagination.page || 1);
    }
  }, [itemsPerPage]);

  // Reset to first page
  const resetToFirstPage = useCallback(() => {
    handlePageChange(1);
  }, [handlePageChange]);

  // Reset pagination state completely
  const reset = useCallback(() => {
    setCurrentPage(defaultPage);
    setTotalPages(1);
    setTotalItems(0);
    setItemsPerPage(defaultItemsPerPage);
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_perPage`);
    }
  }, [defaultPage, defaultItemsPerPage, storageKey]);

  // Get page numbers for display
  const getPageNumbers = useCallback((maxDisplayed = 5) => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayed / 2));
    let endPage = Math.min(totalPages, startPage + maxDisplayed - 1);
    
    if (endPage - startPage + 1 < maxDisplayed) {
      startPage = Math.max(1, endPage - maxDisplayed + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return {
      startPage,
      endPage,
      pageNumbers,
      showFirst: startPage > 1,
      showLast: endPage < totalPages,
      showPrevDots: startPage > 2,
      showNextDots: endPage < totalPages - 1
    };
  }, [currentPage, totalPages]);

  // Computed values
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => Math.min(startIndex + itemsPerPage, totalItems), [startIndex, itemsPerPage, totalItems]);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    // State
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    
    // Methods
    handlePageChange,
    handleItemsPerPageChange,
    updatePagination,
    resetToFirstPage,
    reset,
    getPageNumbers,
    
    // Options
    setItemsPerPage,
    setPersistent: setIsPersistent,
  };
}