foo=bar

if [ -z $foo ]; then
  echo empty
fi

if [ -n "$foo" ]; then
  echo nonempty
fi

