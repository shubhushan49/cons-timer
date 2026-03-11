import { useCallback, useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const REPEAT_COUNT = 5; // For infinite scroll feel: wrap 0→59→0
const DRAG_PX_PER_STEP = 14; // Pixels to drag for one value change
const SUPPRESS_SCROLL_MS = 200; // Ignore scroll events after programmatic scroll (was causing spin with scroll-smooth)

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
  isDark: boolean;
};

function wrapValue(v: number, min: number, max: number): number {
  const range = max - min + 1;
  let x = ((v - min) % range + range) % range;
  return min + x;
}

export function ScrollPicker({ min, max, value, onChange, label, isDark }: Props) {
  const count = max - min + 1;
  const wrappedValue = wrapValue(value, min, max);
  const listRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const initialEditValueRef = useRef('');
  const isUserScroll = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const suppressScrollUntil = useRef(0); // Time-based: ignore scroll events for ~150ms after programmatic scroll
  const mounted = useRef(false);

  const dragStartY = useRef(0);
  const dragAccum = useRef(0);
  const didDrag = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Repeat items for infinite scroll: [0..59, 0..59, 0..59, ...]
  const data = Array.from({ length: count * REPEAT_COUNT }, (_, i) => min + (i % count));

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);
  const paddingPx = ITEM_HEIGHT * paddingItems;
  const blockSize = count * ITEM_HEIGHT;
  const selectedRowIndex = VISIBLE_ITEMS - 1;
  const selectedRowViewportTop = ITEM_HEIGHT * selectedRowIndex;

  useEffect(() => {
    if (isUserScroll.current) {
      isUserScroll.current = false;
      return;
    }
    if (!listRef.current || !mounted.current) return;
    isProgrammaticScroll.current = true;
    suppressScrollUntil.current = Date.now() + SUPPRESS_SCROLL_MS;
    const idxInMiddle = wrappedValue - min;
    const selectedItemTop = paddingPx + blockSize + idxInMiddle * ITEM_HEIGHT;
    const scrollTop = selectedItemTop - selectedRowViewportTop;
    listRef.current.scrollTop = scrollTop;
  }, [wrappedValue, min, count, blockSize, paddingPx, selectedRowViewportTop]);

  useEffect(() => {
    if (!listRef.current) return;
    isProgrammaticScroll.current = true;
    suppressScrollUntil.current = Date.now() + SUPPRESS_SCROLL_MS;
    const idxInMiddle = wrappedValue - min;
    const selectedItemTop = paddingPx + blockSize + idxInMiddle * ITEM_HEIGHT;
    const scrollTop = selectedItemTop - selectedRowViewportTop;
    listRef.current.scrollTop = scrollTop;
    mounted.current = true;
  }, []);

  const handleScroll = useCallback(() => {
    if (!listRef.current || isDragging) return;
    if (Date.now() < suppressScrollUntil.current) return; // Ignore scroll events from programmatic scroll-smooth animation
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const scrollTop = listRef.current.scrollTop;

    // Snap to middle block if scrolled too far
    const lastRowContentTop = scrollTop + selectedRowViewportTop;
    const minScroll = blockSize + paddingPx - selectedRowViewportTop;
    const maxScroll = blockSize * 2 + paddingPx - selectedRowViewportTop - ITEM_HEIGHT;
    if (scrollTop < minScroll || scrollTop > maxScroll) {
      const idxInMiddle = Math.round((lastRowContentTop - paddingPx - blockSize) / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(count - 1, idxInMiddle));
      const newVal = min + clampedIdx;
      isUserScroll.current = true;
      onChange(wrapValue(newVal, min, max));
      const newScroll =
        paddingPx + blockSize + clampedIdx * ITEM_HEIGHT - selectedRowViewportTop;
      isProgrammaticScroll.current = true;
      suppressScrollUntil.current = Date.now() + SUPPRESS_SCROLL_MS;
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = newScroll;
      });
      return;
    }

    const itemIndex = Math.floor((lastRowContentTop - paddingPx) / ITEM_HEIGHT);
    const idxInBlock = ((itemIndex % count) + count) % count;
    const newVal = min + idxInBlock;
    if (newVal !== wrappedValue) {
      isUserScroll.current = true;
      onChange(newVal);
    }
  }, [
    min,
    count,
    wrappedValue,
    onChange,
    blockSize,
    paddingPx,
    selectedRowViewportTop,
    isDragging,
  ]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseInt(editText, 10);
    if (!isNaN(parsed)) {
      onChange(wrapValue(parsed, min, max));
    }
  }, [editText, min, max, onChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragStartY.current = e.clientY;
      dragAccum.current = 0;
      didDrag.current = false;
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - dragStartY.current;
      dragStartY.current = e.clientY;
      dragAccum.current += dy;

      let steps = 0;
      while (dragAccum.current >= DRAG_PX_PER_STEP) {
        steps++;
        dragAccum.current -= DRAG_PX_PER_STEP;
      }
      while (dragAccum.current <= -DRAG_PX_PER_STEP) {
        steps--;
        dragAccum.current += DRAG_PX_PER_STEP;
      }

      if (steps !== 0) {
        didDrag.current = true;
        const range = max - min + 1;
        const currentIdx = (wrappedValue - min + range) % range;
        const newIdx = ((currentIdx - steps) % range + range) % range;
        const newVal = min + newIdx;
        isUserScroll.current = true;
        onChange(newVal);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, wrappedValue, onChange]);

  return (
    <div className="flex flex-col items-center w-20 relative">
      {editing ? (
        <div
          className="flex items-center justify-center"
          style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        >
          <input
            type="text"
            inputMode="numeric"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitEdit();
                return;
              }
              if (e.key >= '0' && e.key <= '9' && editText === initialEditValueRef.current) {
                e.preventDefault();
                setEditText(e.key);
              }
            }}
            maxLength={Math.max(2, String(max).length)}
            className={`w-20 text-3xl font-bold text-center border-b-2 border-sky-600 py-2 tabular-nums ${
              isDark ? 'bg-transparent text-slate-100' : 'bg-transparent text-slate-900'
            }`}
            aria-label={`Type ${label} value`}
            autoFocus
          />
        </div>
      ) : (
        <div
          className="relative w-full select-none cursor-grab active:cursor-grabbing"
          style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            const s = String(wrappedValue);
            initialEditValueRef.current = s;
            setEditText(s);
            setEditing(true);
          }}
        >
          <div
            className="absolute left-0 right-0 rounded-lg border-2 border-sky-600 pointer-events-none z-10 box-border"
            style={{
              top: selectedRowViewportTop,
              height: ITEM_HEIGHT,
              margin: '0 4px',
            }}
          />
          <div
            ref={listRef}
            className="overflow-y-auto overflow-x-hidden h-full w-full [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden pointer-events-auto snap-y snap-mandatory"
            style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
            onScroll={handleScroll}
          >
            <div style={{ paddingTop: paddingPx, paddingBottom: paddingPx }}>
              {data.map((item, i) => {
                const isSelected = item === wrappedValue;
                return (
                  <div
                    key={`${i}-${item}`}
                    onClick={(e) => {
                      if (didDrag.current) {
                        didDrag.current = false;
                        e.stopPropagation();
                        return;
                      }
                      if (isSelected) {
                        const s = String(item);
                        initialEditValueRef.current = s;
                        setEditText(s);
                        setEditing(true);
                      } else {
                        onChange(item);
                      }
                    }}
                    className={`flex items-center justify-center cursor-pointer select-none shrink-0 snap-center ${
                      isSelected ? 'scale-110 font-bold' : ''
                    }`}
                    style={{ height: ITEM_HEIGHT }}
                    role="spinbutton"
                    aria-label={`${item} ${label}`}
                    tabIndex={0}
                  >
                    <span
                      className={`tabular-nums ${
                        isSelected
                          ? 'text-2xl font-bold text-slate-900 dark:text-slate-100'
                          : isDark
                            ? 'text-xl text-slate-400'
                            : 'text-xl text-slate-500'
                      }`}
                    >
                      {String(item).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <span
        className={`mt-2 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        {label}
      </span>
    </div>
  );
}
