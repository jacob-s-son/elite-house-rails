class AddPriorityToCategory < ActiveRecord::Migration
  def self.up
    add_column :categories, :priority, :integer
  end

  def self.down
    remove_column :categories, :priority
  end
end
