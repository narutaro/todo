#!/bin/bash

FUNCTION_NAME=todoFunc-dev

if [ $# -lt 1 ]; then
  echo "Usage: $0 code_file"
else
  zip lambda_function.zip $1 &&
  aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://lambda_function.zip
fi


