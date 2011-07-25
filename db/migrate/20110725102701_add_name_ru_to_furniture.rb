class AddNameRuToFurniture < ActiveRecord::Migration
  def self.up
    add_column :furnitures, :name_ru, :string
  end

  def self.down
    remove_column :furnitures, :name_ru
  end
end
