class CreateWords < ActiveRecord::Migration
  def change
    create_table :words do |t|
      t.string :name
      t.string :language
      t.string :path

      t.timestamps
    end
  end
end
