<script>
  const baseURL = 'https://<api-id>.execute-api.<region>.amazonaws.com/dev/tasks'

  let taskName = ""
  let checked = false
  let modalOn = false

  // sort
  function compare( a, b ) {
    console.log('compare called')
    if ( a['updated-at'] > b['updated-at'] ){ return -1; }
    if ( a['updated-at'] < b['updated-at'] ){ return 1; }
    return 0;
  }

  function sortByCreatedAt(todos){
    console.log('sortBy called')
    todos.then(data => {
      data = data.sort(compare);
    });
    return todos
  }

  function statusText(taskStatus){ return taskStatus ? "Active" : "Done" }

  const listTasks = async () => {
    console.log('listTasks called')
	  const res = await fetch(baseURL);
    return await sortByCreatedAt(res.json())
	}

  const getTask = async (taskId) => {
    console.log('getTask called')
	  const task = await fetch(baseURL + '/' +taskId);
    return await task.json()
  }

  const addTask = async (taskName) => {
    console.log('addTask called!')

    let taskData = {
      "task-id": Date.now().toString(36),
      "is-active": true,
      "task-name": "",
      "updated-at": Date.now().toString(),
      "created-at": Date.now().toString(),
      "user-id": "100"
    }

    taskData['task-name'] = taskName;
	  const res = await fetch(baseURL, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    todos = listTasks() 
	}

  const deleteTask = async (taskId) => {
    console.log('deleteTask called!')
	  const res = await fetch(baseURL + '/' + taskId, {
      method: 'DELETE',
    });
    todos = listTasks() // assignment to ignite the reactivity
	}

  const completeTask = async (taskId, status) => {
	  const res = await fetch(baseURL + '/' + taskId, {
      method: 'PUT',
      body: JSON.stringify({ 'task-id': taskId, 'is-active': !status })
    });
    todos = listTasks()
  }

  let taskDetail = ''
  function showDetail(taskId) {
    console.log('showDetail called')
    modalOn = true
    taskDetail = getTask(taskId)
  }

  // format date
  function fd(date) {
    console.log('fd called')
    let d = new Date(parseInt(date))
    return d.getFullYear() + '/' + d.getMonth() + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes()
  }

  // todos
  let todos = listTasks(); // Initialized as Promise
  $: activeTodos =  checked ? todos : todos.then(data => data.filter(todo => todo['is-active']))

</script>

<main>

  <h1>HELLO TODO!</h1>
  <div class="container is-fluid">
    <div class="columns is-centered">
      <div class="field has-addons">
        <div class="control" style="margin-bottom: 5em;">
          <input class="input" type="text" placeholder="Add a task" bind:value={taskName}>
        </div>
        <div class="control">
          <a class="button is-danger" on:click={() => addTask(taskName)}><i class="fas fa-plus"></i></a>
        </div>
      </div>
    </div>

    <div class="columns" style="width: 200px; margin-left: 60%; margin-bottom: 3em">
      <div class="field">
        <input id="switchRoundedDanger" type="checkbox" name="switchRoundedDanger" class="switch is-rounded is-danger is-rtl" bind:checked={checked}>
        <label for="switchRoundedDanger">Show completed</label>
      </div>
    </div>

    <div class="columns is-centered">
        {#await activeTodos}
          <span class="spinner-loader" style="margin-top: 10em">Loading…</span>
        {:then tasks}
        <table class="table is-hoverable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Created at</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {#each tasks as task}
              <tr>
                <td>{task['task-id']}</td>
                <td>{task['task-name']}</td>
                <td>{fd(task['created-at'])}</td>
                <td>{statusText(task['is-active'])}</td>
                <td>
                  <i class="fas fa-check" on:click={() => completeTask(task['task-id'], task['is-active'])}></i> 
                  <i class="fas fa-info" on:click={() => showDetail(task['task-id'])}></i>
                  <i class="far fa-trash-alt" on:click={() => deleteTask(task['task-id'])}></i>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {/await}
    </div>

    <div class="modal { modalOn ? 'is-active' : ''}">
      <div class="modal-background"></div>
      <div class="modal-content">
        <dev class="box">
        {#await taskDetail}
          <span class="spinner-loader" style="margin-top: 10em">Loading…</span>
        {:then td}
        <table class="table is-fullwidth">
          <thead>
            <tr><td>key</td><td>value</td></tr>
          </thead>
          <tbody>
            <tr><td>task-id</td><td><span class="tag">{td['task-id']}</span></td></tr>
            <tr><td>task-name</td><td><span class="tag">{td['task-name']}</span></td></tr>
            <tr><td>created-at</td><td><span class="tag">{fd(td['created-at'])}</span></td></tr>
            <tr><td>updated-at</td><td><span class="tag">{fd(td['updated-at'])}</span></td></tr>
            <tr><td>is-active</td><td><span class="tag">{td['is-active']}</span></td></tr>
            <tr><td>user-id</td><td><span class="tag">{td['user-id']}</span></td></tr>
          </tbody>
        </table>
        {/await}
        </dev>
      </div>
      <button class="modal-close is-large" aria-label="close" on:click="{() => modalOn = false}"></button>
    </div>

  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    margin-bottom: 1.5em;
  }

  td i {
    padding: 5px;
    cursor: pointer;
    color: gray;
  }

  label { font-family: monospace; }
  table { font-family: monospace; }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

