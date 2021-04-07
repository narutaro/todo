
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Todo.svelte generated by Svelte v3.35.0 */

    const { console: console_1 } = globals;
    const file = "src/Todo.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    // (1:0) <script>   const baseURL = 'https://u4a7kxk6fj.execute-api.us-east-2.amazonaws.com/dev/tasks'    let taskName = ""   let checked = false   let modalOn = false    // sort   function compare( a, b ) {     console.log('compare called')     if ( a['updated-at'] > b['updated-at'] ){ return -1; }
    function create_catch_block_1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(1:0) <script>   const baseURL = 'https://u4a7kxk6fj.execute-api.us-east-2.amazonaws.com/dev/tasks'    let taskName = \\\"\\\"   let checked = false   let modalOn = false    // sort   function compare( a, b ) {     console.log('compare called')     if ( a['updated-at'] > b['updated-at'] ){ return -1; }",
    		ctx
    	});

    	return block;
    }

    // (124:8) {:then tasks}
    function create_then_block_1(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let th4;
    	let t9;
    	let tbody;
    	let each_value = /*tasks*/ ctx[20];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "ID";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Name";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Created at";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Status";
    			t7 = space();
    			th4 = element("th");
    			th4.textContent = "Action";
    			t9 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(th0, file, 127, 14, 3660);
    			add_location(th1, file, 128, 14, 3686);
    			add_location(th2, file, 129, 14, 3714);
    			add_location(th3, file, 130, 14, 3748);
    			add_location(th4, file, 131, 14, 3778);
    			add_location(tr, file, 126, 12, 3641);
    			add_location(thead, file, 125, 10, 3621);
    			add_location(tbody, file, 134, 10, 3841);
    			attr_dev(table, "class", "table is-hoverable svelte-6f5cpe");
    			add_location(table, file, 124, 8, 3576);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(tr, t7);
    			append_dev(tr, th4);
    			append_dev(table, t9);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*deleteTask, activeTodos, showDetail, completeTask, statusText, fd*/ 464) {
    				each_value = /*tasks*/ ctx[20];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(124:8) {:then tasks}",
    		ctx
    	});

    	return block;
    }

    // (136:12) {#each tasks as task}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*task*/ ctx[21]["task-id"] + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*task*/ ctx[21]["task-name"] + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = fd(/*task*/ ctx[21]["created-at"]) + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = statusText(/*task*/ ctx[21]["is-active"]) + "";
    	let t6;
    	let t7;
    	let td4;
    	let i0;
    	let t8;
    	let i1;
    	let t9;
    	let i2;
    	let t10;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[13](/*task*/ ctx[21]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[14](/*task*/ ctx[21]);
    	}

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[15](/*task*/ ctx[21]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			i0 = element("i");
    			t8 = space();
    			i1 = element("i");
    			t9 = space();
    			i2 = element("i");
    			t10 = space();
    			add_location(td0, file, 137, 16, 3918);
    			add_location(td1, file, 138, 16, 3961);
    			add_location(td2, file, 139, 16, 4006);
    			add_location(td3, file, 140, 16, 4056);
    			attr_dev(i0, "class", "fas fa-check svelte-6f5cpe");
    			add_location(i0, file, 142, 18, 4136);
    			attr_dev(i1, "class", "fas fa-info svelte-6f5cpe");
    			add_location(i1, file, 143, 18, 4250);
    			attr_dev(i2, "class", "far fa-trash-alt svelte-6f5cpe");
    			add_location(i2, file, 144, 18, 4341);
    			attr_dev(td4, "class", "svelte-6f5cpe");
    			add_location(td4, file, 141, 16, 4113);
    			add_location(tr, file, 136, 14, 3897);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, i0);
    			append_dev(td4, t8);
    			append_dev(td4, i1);
    			append_dev(td4, t9);
    			append_dev(td4, i2);
    			append_dev(tr, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(i0, "click", click_handler_1, false, false, false),
    					listen_dev(i1, "click", click_handler_2, false, false, false),
    					listen_dev(i2, "click", click_handler_3, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*activeTodos*/ 16 && t0_value !== (t0_value = /*task*/ ctx[21]["task-id"] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*activeTodos*/ 16 && t2_value !== (t2_value = /*task*/ ctx[21]["task-name"] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*activeTodos*/ 16 && t4_value !== (t4_value = fd(/*task*/ ctx[21]["created-at"]) + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*activeTodos*/ 16 && t6_value !== (t6_value = statusText(/*task*/ ctx[21]["is-active"]) + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(136:12) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    // (122:28)            <span class="spinner-loader" style="margin-top: 10em">Loading…</span>         {:then tasks}
    function create_pending_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Loading…";
    			attr_dev(span, "class", "spinner-loader");
    			set_style(span, "margin-top", "10em");
    			add_location(span, file, 122, 10, 3476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(122:28)            <span class=\\\"spinner-loader\\\" style=\\\"margin-top: 10em\\\">Loading…</span>         {:then tasks}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>   const baseURL = 'https://u4a7kxk6fj.execute-api.us-east-2.amazonaws.com/dev/tasks'    let taskName = ""   let checked = false   let modalOn = false    // sort   function compare( a, b ) {     console.log('compare called')     if ( a['updated-at'] > b['updated-at'] ){ return -1; }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>   const baseURL = 'https://u4a7kxk6fj.execute-api.us-east-2.amazonaws.com/dev/tasks'    let taskName = \\\"\\\"   let checked = false   let modalOn = false    // sort   function compare( a, b ) {     console.log('compare called')     if ( a['updated-at'] > b['updated-at'] ){ return -1; }",
    		ctx
    	});

    	return block;
    }

    // (160:8) {:then td}
    function create_then_block(ctx) {
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let td1;
    	let t2;
    	let tbody;
    	let tr1;
    	let td2;
    	let td3;
    	let span0;
    	let t4_value = /*td*/ ctx[19]["task-id"] + "";
    	let t4;
    	let t5;
    	let tr2;
    	let td4;
    	let td5;
    	let span1;
    	let t7_value = /*td*/ ctx[19]["task-name"] + "";
    	let t7;
    	let t8;
    	let tr3;
    	let td6;
    	let td7;
    	let span2;
    	let t10_value = fd(/*td*/ ctx[19]["created-at"]) + "";
    	let t10;
    	let t11;
    	let tr4;
    	let td8;
    	let td9;
    	let span3;
    	let t13_value = fd(/*td*/ ctx[19]["updated-at"]) + "";
    	let t13;
    	let t14;
    	let tr5;
    	let td10;
    	let td11;
    	let span4;
    	let t16_value = /*td*/ ctx[19]["is-active"] + "";
    	let t16;
    	let t17;
    	let tr6;
    	let td12;
    	let td13;
    	let span5;
    	let t19_value = /*td*/ ctx[19]["user-id"] + "";
    	let t19;

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "key";
    			td1 = element("td");
    			td1.textContent = "value";
    			t2 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "task-id";
    			td3 = element("td");
    			span0 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "task-name";
    			td5 = element("td");
    			span1 = element("span");
    			t7 = text(t7_value);
    			t8 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "created-at";
    			td7 = element("td");
    			span2 = element("span");
    			t10 = text(t10_value);
    			t11 = space();
    			tr4 = element("tr");
    			td8 = element("td");
    			td8.textContent = "updated-at";
    			td9 = element("td");
    			span3 = element("span");
    			t13 = text(t13_value);
    			t14 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = "is-active";
    			td11 = element("td");
    			span4 = element("span");
    			t16 = text(t16_value);
    			t17 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "user-id";
    			td13 = element("td");
    			span5 = element("span");
    			t19 = text(t19_value);
    			add_location(td0, file, 162, 16, 4907);
    			add_location(td1, file, 162, 28, 4919);
    			add_location(tr0, file, 162, 12, 4903);
    			add_location(thead, file, 161, 10, 4883);
    			add_location(td2, file, 165, 16, 4992);
    			attr_dev(span0, "class", "tag");
    			add_location(span0, file, 165, 36, 5012);
    			add_location(td3, file, 165, 32, 5008);
    			add_location(tr1, file, 165, 12, 4988);
    			add_location(td4, file, 166, 16, 5079);
    			attr_dev(span1, "class", "tag");
    			add_location(span1, file, 166, 38, 5101);
    			add_location(td5, file, 166, 34, 5097);
    			add_location(tr2, file, 166, 12, 5075);
    			add_location(td6, file, 167, 16, 5170);
    			attr_dev(span2, "class", "tag");
    			add_location(span2, file, 167, 39, 5193);
    			add_location(td7, file, 167, 35, 5189);
    			add_location(tr3, file, 167, 12, 5166);
    			add_location(td8, file, 168, 16, 5267);
    			attr_dev(span3, "class", "tag");
    			add_location(span3, file, 168, 39, 5290);
    			add_location(td9, file, 168, 35, 5286);
    			add_location(tr4, file, 168, 12, 5263);
    			add_location(td10, file, 169, 16, 5364);
    			attr_dev(span4, "class", "tag");
    			add_location(span4, file, 169, 38, 5386);
    			add_location(td11, file, 169, 34, 5382);
    			add_location(tr5, file, 169, 12, 5360);
    			add_location(td12, file, 170, 16, 5455);
    			attr_dev(span5, "class", "tag");
    			add_location(span5, file, 170, 36, 5475);
    			add_location(td13, file, 170, 32, 5471);
    			add_location(tr6, file, 170, 12, 5451);
    			add_location(tbody, file, 164, 10, 4968);
    			attr_dev(table, "class", "table is-fullwidth svelte-6f5cpe");
    			add_location(table, file, 160, 8, 4838);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, td1);
    			append_dev(table, t2);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, td3);
    			append_dev(td3, span0);
    			append_dev(span0, t4);
    			append_dev(tbody, t5);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, td5);
    			append_dev(td5, span1);
    			append_dev(span1, t7);
    			append_dev(tbody, t8);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, td7);
    			append_dev(td7, span2);
    			append_dev(span2, t10);
    			append_dev(tbody, t11);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td8);
    			append_dev(tr4, td9);
    			append_dev(td9, span3);
    			append_dev(span3, t13);
    			append_dev(tbody, t14);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, td11);
    			append_dev(td11, span4);
    			append_dev(span4, t16);
    			append_dev(tbody, t17);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, td13);
    			append_dev(td13, span5);
    			append_dev(span5, t19);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*taskDetail*/ 8 && t4_value !== (t4_value = /*td*/ ctx[19]["task-id"] + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*taskDetail*/ 8 && t7_value !== (t7_value = /*td*/ ctx[19]["task-name"] + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*taskDetail*/ 8 && t10_value !== (t10_value = fd(/*td*/ ctx[19]["created-at"]) + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*taskDetail*/ 8 && t13_value !== (t13_value = fd(/*td*/ ctx[19]["updated-at"]) + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*taskDetail*/ 8 && t16_value !== (t16_value = /*td*/ ctx[19]["is-active"] + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*taskDetail*/ 8 && t19_value !== (t19_value = /*td*/ ctx[19]["user-id"] + "")) set_data_dev(t19, t19_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(160:8) {:then td}",
    		ctx
    	});

    	return block;
    }

    // (158:27)            <span class="spinner-loader" style="margin-top: 10em">Loading…</span>         {:then td}
    function create_pending_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Loading…";
    			attr_dev(span, "class", "spinner-loader");
    			set_style(span, "margin-top", "10em");
    			add_location(span, file, 158, 10, 4741);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(158:27)            <span class=\\\"spinner-loader\\\" style=\\\"margin-top: 10em\\\">Loading…</span>         {:then td}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div10;
    	let div3;
    	let div2;
    	let div0;
    	let input0;
    	let t2;
    	let div1;
    	let a;
    	let i;
    	let t3;
    	let div5;
    	let div4;
    	let input1;
    	let t4;
    	let label;
    	let t6;
    	let div6;
    	let promise;
    	let t7;
    	let div9;
    	let div7;
    	let t8;
    	let div8;
    	let dev;
    	let promise_1;
    	let t9;
    	let button;
    	let div9_class_value;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 20
    	};

    	handle_promise(promise = /*activeTodos*/ ctx[4], info);

    	let info_1 = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 19
    	};

    	handle_promise(promise_1 = /*taskDetail*/ ctx[3], info_1);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "HELLO TODO!";
    			t1 = space();
    			div10 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			a = element("a");
    			i = element("i");
    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");
    			input1 = element("input");
    			t4 = space();
    			label = element("label");
    			label.textContent = "Show completed";
    			t6 = space();
    			div6 = element("div");
    			info.block.c();
    			t7 = space();
    			div9 = element("div");
    			div7 = element("div");
    			t8 = space();
    			div8 = element("div");
    			dev = element("dev");
    			info_1.block.c();
    			t9 = space();
    			button = element("button");
    			attr_dev(h1, "class", "svelte-6f5cpe");
    			add_location(h1, file, 100, 2, 2579);
    			attr_dev(input0, "class", "input");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Add a task");
    			add_location(input0, file, 105, 10, 2778);
    			attr_dev(div0, "class", "control");
    			set_style(div0, "margin-bottom", "5em");
    			add_location(div0, file, 104, 8, 2718);
    			attr_dev(i, "class", "fas fa-plus");
    			add_location(i, file, 108, 73, 2977);
    			attr_dev(a, "class", "button is-danger");
    			add_location(a, file, 108, 10, 2914);
    			attr_dev(div1, "class", "control");
    			add_location(div1, file, 107, 8, 2882);
    			attr_dev(div2, "class", "field has-addons");
    			add_location(div2, file, 103, 6, 2679);
    			attr_dev(div3, "class", "columns is-centered");
    			add_location(div3, file, 102, 4, 2639);
    			attr_dev(input1, "id", "switchRoundedDanger");
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "name", "switchRoundedDanger");
    			attr_dev(input1, "class", "switch is-rounded is-danger is-rtl");
    			add_location(input1, file, 115, 8, 3168);
    			attr_dev(label, "for", "switchRoundedDanger");
    			attr_dev(label, "class", "svelte-6f5cpe");
    			add_location(label, file, 116, 8, 3318);
    			attr_dev(div4, "class", "field");
    			add_location(div4, file, 114, 6, 3140);
    			attr_dev(div5, "class", "columns");
    			set_style(div5, "width", "200px");
    			set_style(div5, "margin-left", "60%");
    			set_style(div5, "margin-bottom", "3em");
    			add_location(div5, file, 113, 4, 3053);
    			attr_dev(div6, "class", "columns is-centered");
    			add_location(div6, file, 120, 4, 3403);
    			attr_dev(div7, "class", "modal-background");
    			add_location(div7, file, 154, 6, 4606);
    			attr_dev(dev, "class", "box");
    			add_location(dev, file, 156, 8, 4685);
    			attr_dev(div8, "class", "modal-content");
    			add_location(div8, file, 155, 6, 4649);
    			attr_dev(button, "class", "modal-close is-large");
    			attr_dev(button, "aria-label", "close");
    			add_location(button, file, 176, 6, 5613);
    			attr_dev(div9, "class", div9_class_value = "modal " + (/*modalOn*/ ctx[2] ? "is-active" : ""));
    			add_location(div9, file, 153, 4, 4550);
    			attr_dev(div10, "class", "container is-fluid");
    			add_location(div10, file, 101, 2, 2602);
    			attr_dev(main, "class", "svelte-6f5cpe");
    			add_location(main, file, 98, 0, 2569);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*taskName*/ ctx[1]);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, a);
    			append_dev(a, i);
    			append_dev(div10, t3);
    			append_dev(div10, div5);
    			append_dev(div5, div4);
    			append_dev(div4, input1);
    			input1.checked = /*checked*/ ctx[0];
    			append_dev(div4, t4);
    			append_dev(div4, label);
    			append_dev(div10, t6);
    			append_dev(div10, div6);
    			info.block.m(div6, info.anchor = null);
    			info.mount = () => div6;
    			info.anchor = null;
    			append_dev(div10, t7);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div9, t8);
    			append_dev(div9, div8);
    			append_dev(div8, dev);
    			info_1.block.m(dev, info_1.anchor = null);
    			info_1.mount = () => dev;
    			info_1.anchor = null;
    			append_dev(div9, t9);
    			append_dev(div9, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(a, "click", /*click_handler*/ ctx[11], false, false, false),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[12]),
    					listen_dev(button, "click", /*click_handler_4*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*taskName*/ 2 && input0.value !== /*taskName*/ ctx[1]) {
    				set_input_value(input0, /*taskName*/ ctx[1]);
    			}

    			if (dirty & /*checked*/ 1) {
    				input1.checked = /*checked*/ ctx[0];
    			}

    			info.ctx = ctx;

    			if (dirty & /*activeTodos*/ 16 && promise !== (promise = /*activeTodos*/ ctx[4]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[20] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}

    			info_1.ctx = ctx;

    			if (dirty & /*taskDetail*/ 8 && promise_1 !== (promise_1 = /*taskDetail*/ ctx[3]) && handle_promise(promise_1, info_1)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[19] = info_1.resolved;
    				info_1.block.p(child_ctx, dirty);
    			}

    			if (dirty & /*modalOn*/ 4 && div9_class_value !== (div9_class_value = "modal " + (/*modalOn*/ ctx[2] ? "is-active" : ""))) {
    				attr_dev(div9, "class", div9_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    			info_1.block.d();
    			info_1.token = null;
    			info_1 = null;
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const baseURL = "https://u4a7kxk6fj.execute-api.us-east-2.amazonaws.com/dev/tasks";

    // sort
    function compare(a, b) {
    	console.log("compare called");

    	if (a["updated-at"] > b["updated-at"]) {
    		return -1;
    	}

    	if (a["updated-at"] < b["updated-at"]) {
    		return 1;
    	}

    	return 0;
    }

    function sortByCreatedAt(todos) {
    	console.log("sortBy called");

    	todos.then(data => {
    		data = data.sort(compare);
    	});

    	return todos;
    }

    function statusText(taskStatus) {
    	return taskStatus ? "Active" : "Done";
    }

    // format date
    function fd(date) {
    	console.log("fd called");
    	let d = new Date(parseInt(date));
    	return d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
    }

    function instance($$self, $$props, $$invalidate) {
    	let activeTodos;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Todo", slots, []);
    	let taskName = "";
    	let checked = false;
    	let modalOn = false;

    	const listTasks = async () => {
    		console.log("listTasks called");
    		const res = await fetch(baseURL);

    		//return await res.json()
    		return await sortByCreatedAt(res.json());
    	};

    	const getTask = async taskId => {
    		console.log("getTask called");
    		const task = await fetch(baseURL + "/" + taskId);

    		//console.log(task.json())
    		return await task.json();
    	};

    	const addTask = async taskName => {
    		console.log("addTask called!");

    		let taskData = {
    			"task-id": Date.now().toString(36),
    			"is-active": true,
    			"task-name": "",
    			"updated-at": Date.now().toString(),
    			"created-at": Date.now().toString(),
    			"user-id": "100"
    		};

    		taskData["task-name"] = taskName;

    		await fetch(baseURL, {
    			method: "POST",
    			body: JSON.stringify(taskData)
    		});

    		$$invalidate(9, todos = listTasks()); // 代入しないとリアクティブが発火しない
    	}; //return await res.json()

    	const deleteTask = async taskId => {
    		console.log("deleteTask called!");
    		await fetch(baseURL + "/" + taskId, { method: "DELETE" });
    		$$invalidate(9, todos = listTasks()); // assignment to ignite the reactivity
    	}; //return await res.json()

    	const completeTask = async (taskId, status) => {
    		await fetch(baseURL + "/" + taskId, {
    			method: "PUT",
    			body: JSON.stringify({ "task-id": taskId, "is-active": !status })
    		});

    		$$invalidate(9, todos = listTasks());
    	};

    	let taskDetail = "";

    	function showDetail(taskId) {
    		console.log("showDetail called");
    		$$invalidate(2, modalOn = true);

    		//return getTask(taskId)
    		$$invalidate(3, taskDetail = getTask(taskId));
    	}

    	// todos
    	let todos = listTasks(); // Initialized as Promise

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Todo> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		taskName = this.value;
    		$$invalidate(1, taskName);
    	}

    	const click_handler = () => addTask(taskName);

    	function input1_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	const click_handler_1 = task => completeTask(task["task-id"], task["is-active"]);
    	const click_handler_2 = task => showDetail(task["task-id"]);
    	const click_handler_3 = task => deleteTask(task["task-id"]);
    	const click_handler_4 = () => $$invalidate(2, modalOn = false);

    	$$self.$capture_state = () => ({
    		baseURL,
    		taskName,
    		checked,
    		modalOn,
    		compare,
    		sortByCreatedAt,
    		statusText,
    		listTasks,
    		getTask,
    		addTask,
    		deleteTask,
    		completeTask,
    		taskDetail,
    		showDetail,
    		fd,
    		todos,
    		activeTodos
    	});

    	$$self.$inject_state = $$props => {
    		if ("taskName" in $$props) $$invalidate(1, taskName = $$props.taskName);
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("modalOn" in $$props) $$invalidate(2, modalOn = $$props.modalOn);
    		if ("taskDetail" in $$props) $$invalidate(3, taskDetail = $$props.taskDetail);
    		if ("todos" in $$props) $$invalidate(9, todos = $$props.todos);
    		if ("activeTodos" in $$props) $$invalidate(4, activeTodos = $$props.activeTodos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, todos*/ 513) {
    			$$invalidate(4, activeTodos = checked
    			? todos
    			: todos.then(data => data.filter(todo => todo["is-active"])));
    		}
    	};

    	return [
    		checked,
    		taskName,
    		modalOn,
    		taskDetail,
    		activeTodos,
    		addTask,
    		deleteTask,
    		completeTask,
    		showDetail,
    		todos,
    		input0_input_handler,
    		click_handler,
    		input1_change_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Todo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todo",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Todo({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
