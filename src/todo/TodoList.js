import React, { useState, useMemo, useEffect, useLayoutEffect, useContext } from 'react';
import '../index.css';
import * as UI from '../ui/ui';
import { CookieContext, ORDER_COOKIE } from '../misc/cookies';
import TodoItem from './TodoItem';
import TodoNew from './TodoNew';

/** @typedef {'red'|'green'|'blue'|'yellow'} Label */
/** @typedef {{words: string[], label: ?Label}} Filter */
/** @typedef {{key: number, order: number, description: string, status: bool, labels: Label[]}} Item */

/**
 * A wrapper component to represent a list of re-orderable buttons.
 * @param {{list: Item[], name: string}} props
 */
export function TodoSection(props) {
    const cookies = useContext(CookieContext);
    const order_cookie = useMemo(() => `${ORDER_COOKIE}-${props.name}`, [props.name]);

    const [ordering, setOrdering] = useState(() => {
        const ordering = cookies?.get(order_cookie);
        if (ordering) {
            return ordering.map((key) => ({ key, draggable: false }));
        } else {
            return props.list.map((item) => ({ key: item.key, draggable: false }));
        }
    });
    const [dragging, setDragging] = useState(null);

    useEffect(
        () => cookies?.set(order_cookie, ordering.map(({ key }) => key)),
        [ordering, cookies, order_cookie],
    );

    useLayoutEffect(
        () => {
            setOrdering((ordering) => {
                return ordering
                    .concat(props.list
                        .filter((item) => ordering.every((ord) => item.key !== ord.key))
                        .map((item) => ({ key: item.key, draggable: false })));
            });
        },
        [props.list],
    );

    /** 
     * @param {string} field
     * @return {(key: number, value: any) => void}
     */
    const setOrderableField = (field) => (key, value) => {
        setOrdering((ordering) => {
            const index = ordering.findIndex((ord) => ord.key === key);
            const newOrdering = ordering.slice();
            newOrdering[index] = { ...ordering[index], [field]: value };
            return newOrdering;
        });
    };

    const setDraggable = setOrderableField('draggable');

    /** 
     * @param {number} key
     * @return {number}
     */
    const getOrder = (key) => ordering.findIndex((ord) => ord.key === key);
    /** 
     * @param {number} key
     * @param {number} newIndex
     */
    const setOrder = (key, newIndex) => {
        const oldIndex = ordering.findIndex((ord) => ord.key === key);

        if (newIndex < oldIndex) {
            setOrdering((ordering) => [
                ...ordering.slice(0, newIndex),
                ordering[oldIndex],
                ...ordering.slice(newIndex, oldIndex),
                ...ordering.slice(oldIndex + 1),
            ]);
        } else if (newIndex > oldIndex) {
            setOrdering((ordering) => [
                ...ordering.slice(0, oldIndex),
                ...ordering.slice(oldIndex + 1, newIndex + 1),
                ordering[oldIndex],
                ...ordering.slice(newIndex + 1),
            ]);
        }
    };

    const list = useMemo(
        () => ordering
            .map((order) => [props.list.find((item) => item.key === order.key), order])
            .filter(([item]) => item),
        [ordering, props.list],
    );

    if (props.list.length === 0) {
        return null;
    }

    return (
        <div
            role="list"
            className="grid grid-cols-1 gap-2 w-full justify-center my-2"
            onDragOver={(event) => {
                if (dragging) {
                    event.preventDefault();
                }
            }}
        >
            {
                list.map(([item, order]) => {
                    return (
                        <div
                            key={item.key}
                            className={order.draggable ? "opacity-40" : ""}
                            draggable={order.draggable}
                            onDragStart={() => setDragging(item.key)}
                            onDragEnd={() => {
                                setDragging(null);
                                setDraggable(item.key, false);
                            }}
                            onDragEnter={(event) => {
                                if (dragging) {
                                    const newIndex = getOrder(item.key);
                                    setOrder(dragging, newIndex);
                                    event.preventDefault();
                                }
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                            }}
                        >
                            <TodoItem
                                key={item.key}
                                item={item}
                                setItemStatus={props.setItemStatus}
                                deleteItem={props.deleteItem}
                                toggleLabel={props.toggleLabel}
                                onDragDown={() => setDraggable(item.key, true)}
                                onDragUp={() => {
                                    if (!dragging) {
                                        setDraggable(item.key, false);
                                    }
                                }}
                            />
                        </div>
                    );
                })
            }
        </div>
    )
}

/** 
 * A component that represents all items on the list, sorts them by status, and filters and/or searches.
 * @param {{list: Item[], filter: Filter, addNewItem: (description: string, labels: Label[]) => void, deleteItem: () => void, toggleLabel: (key: number, label: Label) => void, setItemStatus: (key: number, status: bool) => void}} props 
 */
export function TodoList(props) {
    const filtered = useMemo(
        () => props.list
            // filter by label
            .filter((item) => {
                return !props.filter.label || item.labels.includes(props.filter.label);
            })
            // filter by search
            .filter((item) => {
                const desc = item.description.toLowerCase();
                return props.filter.words.every((word) => desc.includes(word));
            }),
        [props.list, props.filter.words, props.filter.label],
    );

    // checks if all items have the same 'status' flag
    const [allStatus] = useMemo(() =>
        filtered.reduce(([all, prev], item) => {
            if (!all) {
                return [false, null];
            } else if (prev === null) {
                return [all, item.status];
            } else {
                return [prev === item.status, item.status];
            }
        }, [true, null]),
        [filtered],
    );

    return (
        <div className="grid grid-cols-1 gap-1 w-full justify-center">
            <TodoNew
                id="todoNew"
                addNewItem={props.addNewItem}
            />
            <TodoSection
                name="in-progress"
                list={filtered.filter((item) => !item.status)}
                setItemStatus={props.setItemStatus}
                deleteItem={props.deleteItem}
                toggleLabel={props.toggleLabel}
            />
            {!allStatus && <UI.HorizontalDivider className="my-2" />}
            <TodoSection
                name="completed"
                list={filtered.filter((item) => item.status)}
                setItemStatus={props.setItemStatus}
                deleteItem={props.deleteItem}
                toggleLabel={props.toggleLabel}
            />
        </div>
    );
}

export default TodoList;