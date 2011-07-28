class AddPriorityToFurniture < ActiveRecord::Migration
  def self.up
    add_column :furnitures, :priority, :integer
  end

  def self.down
    remove_column :furnitures, :priority
  end
end
