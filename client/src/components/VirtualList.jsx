import React, { useRef, useState, useEffect, useMemo } from 'react';

/**
 * A lightweight, dependency-free VirtualList component.
 * Renders only visible rows to ensure high-performance rendering of 1000+ items.
 */
export default function VirtualList({
  items = [],
  itemHeight = 80,
  height = 400,
  renderItem,
  className = ''
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  
  // Render a buffer of 2 extra items above and below to prevent flashing during fast scrolls
  const buffer = 2;
  const visibleCount = Math.ceil(height / itemHeight) + buffer * 2;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      }
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto relative ${className}`}
      style={{ height, contain: 'content' }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={item.id || index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
