"""
Test suite for the calculator module.
"""

import pytest
from calculator import add, subtract, multiply, divide


class TestAdd:
    """Tests for the add function."""
    
    def test_add_positive_numbers(self):
        """Test adding two positive numbers."""
        assert add(2, 3) == 5
        assert add(10, 20) == 30
    
    def test_add_negative_numbers(self):
        """Test adding two negative numbers."""
        assert add(-2, -3) == -5
        assert add(-10, -20) == -30
    
    def test_add_mixed_numbers(self):
        """Test adding positive and negative numbers."""
        assert add(5, -3) == 2
        assert add(-5, 3) == -2
    
    def test_add_zero(self):
        """Test adding zero."""
        assert add(5, 0) == 5
        assert add(0, 5) == 5
        assert add(0, 0) == 0
    
    def test_add_floats(self):
        """Test adding floating point numbers."""
        assert add(2.5, 3.5) == 6.0
        assert add(1.1, 2.2) == pytest.approx(3.3)


class TestSubtract:
    """Tests for the subtract function."""
    
    def test_subtract_positive_numbers(self):
        """Test subtracting positive numbers."""
        assert subtract(5, 3) == 2
        assert subtract(20, 10) == 10
    
    def test_subtract_negative_numbers(self):
        """Test subtracting negative numbers."""
        assert subtract(-5, -3) == -2
        assert subtract(-10, -20) == 10
    
    def test_subtract_mixed_numbers(self):
        """Test subtracting with mixed signs."""
        assert subtract(5, -3) == 8
        assert subtract(-5, 3) == -8
    
    def test_subtract_zero(self):
        """Test subtracting zero."""
        assert subtract(5, 0) == 5
        assert subtract(0, 5) == -5
        assert subtract(0, 0) == 0
    
    def test_subtract_floats(self):
        """Test subtracting floating point numbers."""
        assert subtract(5.5, 2.5) == 3.0
        assert subtract(10.1, 5.05) == pytest.approx(5.05)


class TestMultiply:
    """Tests for the multiply function."""
    
    def test_multiply_positive_numbers(self):
        """Test multiplying positive numbers."""
        assert multiply(2, 3) == 6
        assert multiply(5, 4) == 20
    
    def test_multiply_negative_numbers(self):
        """Test multiplying negative numbers."""
        assert multiply(-2, -3) == 6
        assert multiply(-5, -4) == 20
    
    def test_multiply_mixed_numbers(self):
        """Test multiplying with mixed signs."""
        assert multiply(2, -3) == -6
        assert multiply(-5, 4) == -20
    
    def test_multiply_by_zero(self):
        """Test multiplying by zero."""
        assert multiply(5, 0) == 0
        assert multiply(0, 5) == 0
        assert multiply(0, 0) == 0
    
    def test_multiply_by_one(self):
        """Test multiplying by one."""
        assert multiply(5, 1) == 5
        assert multiply(1, 5) == 5
    
    def test_multiply_floats(self):
        """Test multiplying floating point numbers."""
        assert multiply(2.5, 4) == 10.0
        assert multiply(1.5, 2.5) == pytest.approx(3.75)


class TestDivide:
    """Tests for the divide function."""
    
    def test_divide_positive_numbers(self):
        """Test dividing positive numbers."""
        assert divide(6, 3) == 2
        assert divide(20, 4) == 5
    
    def test_divide_negative_numbers(self):
        """Test dividing negative numbers."""
        assert divide(-6, -3) == 2
        assert divide(-20, -4) == 5
    
    def test_divide_mixed_numbers(self):
        """Test dividing with mixed signs."""
        assert divide(6, -3) == -2
        assert divide(-20, 4) == -5
    
    def test_divide_by_one(self):
        """Test dividing by one."""
        assert divide(5, 1) == 5
        assert divide(-5, 1) == -5
    
    def test_divide_zero_by_number(self):
        """Test dividing zero by a number."""
        assert divide(0, 5) == 0
        assert divide(0, -5) == 0
    
    def test_divide_floats(self):
        """Test dividing floating point numbers."""
        assert divide(7.5, 2.5) == 3.0
        assert divide(10, 4) == 2.5
    
    def test_divide_by_zero_raises_error(self):
        """Test that dividing by zero raises ZeroDivisionError."""
        with pytest.raises(ZeroDivisionError) as excinfo:
            divide(5, 0)
        assert "Cannot divide by zero" in str(excinfo.value)
    
    def test_divide_negative_by_zero_raises_error(self):
        """Test that dividing negative number by zero raises ZeroDivisionError."""
        with pytest.raises(ZeroDivisionError) as excinfo:
            divide(-5, 0)
        assert "Cannot divide by zero" in str(excinfo.value)
    
    def test_divide_zero_by_zero_raises_error(self):
        """Test that dividing zero by zero raises ZeroDivisionError."""
        with pytest.raises(ZeroDivisionError) as excinfo:
            divide(0, 0)
        assert "Cannot divide by zero" in str(excinfo.value)
