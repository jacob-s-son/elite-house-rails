class AddPriorityToSubCategory < ActiveRecord::Migration
  def self.up
    add_column :sub_categories, :priority, :integer
  end

  def self.down
    remove_column :sub_categories, :priority
  end
end
