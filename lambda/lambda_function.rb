require 'json'
require 'json/add/exception'
require 'aws-sdk-dynamodb'

CORS_HEADER = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Origin": '*',
  "Access-Control-Allow-Methods": "OPTIONS,POST,PUT,GET"
}

def add_task(table, body)
  begin
    table.put_item({ item: body })  
    { statusCode: 200, headers: CORS_HEADER, body: JSON.generate(body) }
  rescue => e
    { statusCode: 500, body: e.to_json }
  end
end

def delete_task(table, task_id)
  begin
    params = { table_name: table, key: { 'task-id': task_id } }
    table.delete_item(params)
    list_task(table)
  rescue => e
    { statusCode: 500, body: e.to_json }
  end
end

def update_task(table, body)
  begin
    params = {
      table_name: table,
      key: { 'task-id': body['task-id'] },
      attribute_updates: {
        'is-active': { value: body['is-active'], action: "PUT" },
      #  'task-name': { value: body['task-name'], action: "PUT" },
      #  'updated-at': { value: body['updated-at'], action: "PUT" }
      }
    }
    table.update_item(params)  # これやるとCORSに引っかかる
    { statusCode: 200, headers: CORS_HEADER, body: JSON.generate(body) }
#    { statusCode: 200, body: JSON.generate(body) }
  rescue => e
    { statusCode: 500, headers: CORS_HEADER, body: e.to_json }
  end
end

def put_cors_test(table, body)
  { statusCode: 200, headers: CORS_HEADER, body: JSON.generate(body) }
end

def list_task(table)
  begin
    scan_output = table.scan({ limit: 50, select: "ALL_ATTRIBUTES" })
    { statusCode: 200, headers: CORS_HEADER, body: JSON.generate(scan_output['items']) }
  rescue => e
    { statusCode: 500, body: e.to_json }
  end
end

def get_task(table, task_id)
  begin
    params = { key: { 'task-id': task_id } }
    task = table.get_item(params)
    { statusCode: 200, headers: CORS_HEADER, body: JSON.generate(task['item']) }
  rescue => e
    { statusCode: 500, body: e.to_json }
  end
end

def lambda_handler(event:, context:)
 
  begin
    http_method = event['httpMethod']
    dynamodb = Aws::DynamoDB::Resource.new(region: 'us-east-2')
    table = dynamodb.table('todoTable-dev')
    
    case http_method
      when 'GET'
        path_param = event.dig('pathParameters', 'proxy')
        if path_param.nil?
          list_task(table)
        else
          get_task(table, path_param) 
        end
      when 'PUT'    then update_task(table, JSON.parse(event['body']))
      #when 'PUT'    then put_cors_test(table, JSON.parse(event['body']))
      when 'POST'   then result = add_task(table, JSON.parse(event['body']))
      when 'DELETE' then delete_task(table, event['pathParameters']['proxy'])
      else 0
    end
  rescue => e
    { statusCode: 500, body: e.to_json }
  end

end
