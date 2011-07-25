class CreateFurnitures < ActiveRecord::Migration
  def self.up
    create_table :furnitures do |t|
      t.string   "name"
      t.text     "description_lv"
      t.text     "description_ru"
      t.integer  "sub_category_id"
      t.timestamps
    end
  end

  def self.down
    drop_table :furnitures
  end
end
