class AddCategoryIdToFurniture < ActiveRecord::Migration
  def self.up
    add_column :furnitures, :category_id, :integer
  end

  def self.down
    remove_column :furnitures, :category_id
  end
end
