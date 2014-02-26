json.array!(@words) do |word|
  json.extract! word, :id, :name, :language, :path
  json.url word_url(word, format: :json)
end
